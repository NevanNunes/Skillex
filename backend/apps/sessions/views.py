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

        # AI Session Planning & Summarization
        if action == 'plan':
            from apps.integrations.ai_service import generate_lesson_plan
            from apps.skills.models import UserSkillTeach, UserSkillLearn
            
            # Find the teacher's skill profile
            try:
                teacher_skill = UserSkillTeach.objects.get(user=session.teacher, skill=session.match.teach_skill.skill)
            except UserSkillTeach.DoesNotExist:
                return Response({'detail': 'Teacher skill profile not found.'}, status=404)
                
            # Find the learner's skill profile
            learner_level = "Beginner"
            try:
                learner_skill = UserSkillLearn.objects.get(user=session.learner, skill=session.match.teach_skill.skill)
                learner_level = learner_skill.current_level
            except UserSkillLearn.DoesNotExist:
                pass
                
            plan_md = generate_lesson_plan(teacher_skill, learner_level, session.duration_minutes)
            return Response({'plan': plan_md})
            
        elif action == 'summarize':
            from apps.integrations.ai_service import summarize_session
            notes = request.data.get('notes', '')
            if not notes:
                return Response({'detail': 'Please provide session notes to summarize.'}, status=400)
                
            summary_md = summarize_session(notes, session.teacher.username, session.learner.username)
            return Response({'summary': summary_md})

        return Response(SessionSerializer(session).data)

from rest_framework import viewsets
from rest_framework.decorators import action
from .models import StudyCircle
from .serializers import StudyCircleSerializer

class StudyCircleViewSet(viewsets.ModelViewSet):
    serializer_class = StudyCircleSerializer

    def get_queryset(self):
        return StudyCircle.objects.all().select_related('teacher', 'skill')

    def perform_create(self, serializer):
        serializer.save(teacher=self.request.user)

    @action(detail=True, methods=['post'])
    def join(self, request, pk=None):
        circle = self.get_object()
        if circle.status != 'open':
            return Response({'detail': 'Circle is not open.'}, status=400)
        if circle.participants.count() >= circle.max_participants:
            circle.status = 'full'
            circle.save(update_fields=['status'])
            return Response({'detail': 'Circle is full.'}, status=400)
        if request.user == circle.teacher:
            return Response({'detail': 'Teacher cannot join their own circle as a learner.'}, status=400)
            
        circle.participants.add(request.user)
        if circle.participants.count() >= circle.max_participants:
            circle.status = 'full'
            circle.save(update_fields=['status'])
            
        return Response(StudyCircleSerializer(circle).data)

    @action(detail=True, methods=['post'])
    def leave(self, request, pk=None):
        circle = self.get_object()
        circle.participants.remove(request.user)
        if circle.status == 'full' and circle.participants.count() < circle.max_participants:
            circle.status = 'open'
            circle.save(update_fields=['status'])
        return Response(StudyCircleSerializer(circle).data)