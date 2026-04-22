# apps/sessions/views.py
from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from apps.matching.models import Match
from .models import Session
from .serializers import (
    SessionSerializer, BookSessionSerializer,
    CancelSessionSerializer, SessionFeedbackSerializer,
)
from .services import book_session, confirm_session, cancel_session, complete_session


class SessionListView(generics.ListAPIView):
    serializer_class = SessionSerializer

    def get_queryset(self):
        user = self.request.user
        qs = Session.objects.filter(
            teacher=user
        ) | Session.objects.filter(learner=user)
        status_filter = self.request.query_params.get('status')
        if status_filter:
            qs = qs.filter(status=status_filter)
        return qs.order_by('scheduled_at')


class BookSessionView(APIView):
    def post(self, request):
        serializer = BookSessionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        match = get_object_or_404(
            Match, id=data['match_id'], learner=request.user, status='accepted'
        )
        try:
            session = book_session(match, data['scheduled_at'], data['duration_minutes'])
        except ValueError as e:
            return Response({'detail': str(e)}, status=400)

        return Response(SessionSerializer(session).data, status=201)


class SessionActionView(APIView):
    """
    POST /api/sessions/<pk>/<action>/
    Supported actions: confirm, cancel, complete, feedback
    """
    def post(self, request, pk, action):
        session = get_object_or_404(Session, id=pk)

        try:
            if action == 'confirm':
                session = confirm_session(session, request.user)
                # Notify both users
                try:
                    from apps.notification.services import notify_session_confirmed
                    other = session.learner if request.user == session.teacher else session.teacher
                    notify_session_confirmed(other, request.user.username, session.id, session.scheduled_at)
                except ImportError:
                    pass

            elif action == 'cancel':
                ser = CancelSessionSerializer(data=request.data)
                ser.is_valid(raise_exception=True)
                session = cancel_session(
                    session, request.user,
                    ser.validated_data.get('reason', ''),
                )
                # Notify the other user
                try:
                    from apps.notification.services import notify_session_cancelled
                    other = session.learner if request.user == session.teacher else session.teacher
                    notify_session_cancelled(other, request.user.username, session.id)
                except ImportError:
                    pass

            elif action == 'complete':
                if request.user not in [session.teacher, session.learner]:
                    raise PermissionError('Not a participant.')
                if session.status != 'confirmed':
                    raise ValueError('Only confirmed sessions can be completed.')
                session = complete_session(session)
                # Award XP to both participants
                try:
                    from apps.gamification.services import award_xp
                    award_xp(session.teacher, 'session_completed_mentor',
                             reference_id=session.id)
                    award_xp(session.learner, 'session_completed_learner',
                             reference_id=session.id)
                except ImportError:
                    pass
                # Notify both users
                try:
                    from apps.notification.services import notify
                    for u in [session.teacher, session.learner]:
                        partner = session.learner if u == session.teacher else session.teacher
                        notify(
                            user=u,
                            notification_type='session_completed',
                            title='Session completed!',
                            message=f'Your session with {partner.username} is marked as done. Don\'t forget to leave feedback!',
                            payload={'session_id': str(session.id)},
                        )
                except ImportError:
                    pass

            elif action == 'feedback':
                ser = SessionFeedbackSerializer(data=request.data)
                ser.is_valid(raise_exception=True)
                if request.user not in [session.teacher, session.learner]:
                    raise PermissionError('Not a participant.')
                if session.status != 'completed':
                    raise ValueError('Can only leave feedback on completed sessions.')
                # Delegate to review service
                from apps.reviews.services import create_review
                review = create_review(
                    reviewer=request.user,
                    session_id=str(session.id),
                    rating=ser.validated_data['rating'],
                    comment=ser.validated_data.get('comment', ''),
                )
                # Award XP for submitting a review
                try:
                    from apps.gamification.services import award_xp
                    award_xp(request.user, 'review_submitted',
                             reference_id=session.id)
                except ImportError:
                    pass
                return Response({
                    'detail': 'Feedback submitted.',
                    'review_id': str(review.id),
                    'session': SessionSerializer(session).data,
                })

            else:
                return Response({'detail': 'Invalid action.'}, status=400)

        except PermissionError as e:
            return Response({'detail': str(e)}, status=status.HTTP_403_FORBIDDEN)
        except ValueError as e:
            return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)

        return Response(SessionSerializer(session).data)