# apps/integrations/views.py
"""
Views for external API integrations:
  - Google Calendar OAuth2 flow
  - Daily.co room/token management
"""
from datetime import timedelta
from django.conf import settings
from django.utils import timezone
from django.shortcuts import redirect
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions, status

from .models import GoogleCalendarToken
from .google_calendar_service import (
    get_authorization_url, exchange_code_for_tokens,
    refresh_access_token, create_calendar_event,
)
from .daily_service import create_room, create_meeting_token


# ──────────────────────────────────────────
# Google Calendar OAuth2 Flow
# ──────────────────────────────────────────
class GoogleCalendarConnectView(APIView):
    """
    GET /api/integrations/google/connect/
    Redirects the user to Google's OAuth2 consent screen.
    """
    def get(self, request):
        url = get_authorization_url(state=str(request.user.id))
        return Response({'auth_url': url})


class GoogleCalendarCallbackView(APIView):
    """
    GET /api/integrations/google/callback/?code=...&state=...
    Handles the OAuth2 callback, exchanges code for tokens, stores them.
    """
    permission_classes = [permissions.AllowAny]  # Google redirects here

    def get(self, request):
        code = request.query_params.get('code')
        if not code:
            return Response({'detail': 'Missing code.'}, status=400)

        tokens = exchange_code_for_tokens(code)
        if not tokens:
            return Response({'detail': 'Token exchange failed.'}, status=502)

        # The state param contains the user_id
        from apps.users.models import User
        state = request.query_params.get('state', '')
        try:
            user = User.objects.get(id=state)
        except User.DoesNotExist:
            return Response({'detail': 'Invalid state.'}, status=400)

        GoogleCalendarToken.objects.update_or_create(
            user=user,
            defaults={
                'access_token': tokens['access_token'],
                'refresh_token': tokens.get('refresh_token', ''),
                'expires_at': timezone.now() + timedelta(seconds=tokens['expires_in']),
            },
        )

        # Redirect to frontend success page
        return redirect('http://localhost:5173/settings?google=connected')


class GoogleCalendarStatusView(APIView):
    """GET /api/integrations/google/status/ — check if calendar is connected."""
    def get(self, request):
        try:
            token = GoogleCalendarToken.objects.get(user=request.user)
            return Response({
                'connected': True,
                'expires_at': token.expires_at.isoformat(),
            })
        except GoogleCalendarToken.DoesNotExist:
            return Response({'connected': False})


class GoogleCalendarSyncView(APIView):
    """
    POST /api/integrations/google/sync/<session_id>/
    Create a Google Calendar event for a confirmed session.
    """
    def post(self, request, session_id):
        from apps.sessions.models import Session
        from django.shortcuts import get_object_or_404

        session = get_object_or_404(Session, id=session_id)
        if request.user not in [session.teacher, session.learner]:
            return Response({'detail': 'Not a participant.'}, status=403)
        if session.status not in ['confirmed', 'completed']:
            return Response({'detail': 'Session must be confirmed first.'}, status=400)
        # Fix #3: Ensure video room is created before syncing to calendar
        if not session.meeting_url:
            return Response({
                'detail': 'Please create a video room first before syncing to your calendar.',
            }, status=400)

        try:
            token_obj = GoogleCalendarToken.objects.get(user=request.user)
        except GoogleCalendarToken.DoesNotExist:
            return Response({'detail': 'Google Calendar not connected.'}, status=400)

        # Refresh token if expired
        access_token = token_obj.access_token
        if token_obj.expires_at <= timezone.now():
            access_token = refresh_access_token(token_obj.refresh_token)
            if not access_token:
                return Response({'detail': 'Failed to refresh token. Please reconnect.'}, status=401)
            token_obj.access_token = access_token
            token_obj.expires_at = timezone.now() + timedelta(hours=1)
            token_obj.save()

        event_id = create_calendar_event(access_token, session)
        if not event_id:
            return Response({'detail': 'Failed to create calendar event.'}, status=502)

        return Response({'event_id': event_id, 'detail': 'Calendar event created.'})


# ──────────────────────────────────────────
# Daily.co WebRTC
# ──────────────────────────────────────────
class CreateVideoRoomView(APIView):
    """
    POST /api/integrations/daily/room/<session_id>/
    Create a Daily.co video room for a session and store the meeting URL.
    """
    def post(self, request, session_id):
        from apps.sessions.models import Session
        from django.shortcuts import get_object_or_404

        session = get_object_or_404(Session, id=session_id)
        if request.user not in [session.teacher, session.learner]:
            return Response({'detail': 'Not a participant.'}, status=403)
        if session.status == 'cancelled':
            return Response({'detail': 'Cancelled sessions cannot create a video room.'}, status=400)

        # Don't recreate if already has a meeting URL.
        # If this is a legacy Jitsi fallback link, rotate it to the current fallback provider.
        if session.meeting_url:
            if (not settings.DAILY_API_KEY) and ('meet.jit.si/' in session.meeting_url):
                room = create_room(session.id, session.scheduled_at, session.duration_minutes)
                if not room:
                    return Response({'detail': 'Failed to refresh video room.'}, status=502)
                session.meeting_url = room['url']
                session.save(update_fields=['meeting_url'])
                return Response({
                    'room_name': room['name'],
                    'meeting_url': room['url'],
                    'detail': 'Legacy room refreshed.',
                }, status=200)
            return Response({
                'meeting_url': session.meeting_url,
                'detail': 'Room already exists.',
            })

        room = create_room(session.id, session.scheduled_at, session.duration_minutes)
        if not room:
            return Response({'detail': 'Failed to create video room.'}, status=502)

        # Save the meeting URL to the session
        session.meeting_url = room['url']
        session.save(update_fields=['meeting_url'])

        try:
            from apps.notification.services import notify_session_scheduled
            for user in [session.teacher, session.learner]:
                partner = session.learner if user == session.teacher else session.teacher
                notify_session_scheduled(
                    user=user,
                    partner_name=partner.username,
                    session_id=session.id,
                    scheduled_at=session.scheduled_at,
                )
        except ImportError:
            pass

        return Response({
            'room_name': room['name'],
            'meeting_url': room['url'],
            'detail': 'Video room created.',
        }, status=201)


class GetVideoTokenView(APIView):
    """
    GET /api/integrations/daily/token/<session_id>/
    Generate a time-limited meeting token for the current user.
    """
    def get(self, request, session_id):
        from apps.sessions.models import Session
        from django.shortcuts import get_object_or_404

        session = get_object_or_404(Session, id=session_id)
        if request.user not in [session.teacher, session.learner]:
            return Response({'detail': 'Not a participant.'}, status=403)

        if not session.meeting_url:
            return Response({'detail': 'No video room exists for this session.'}, status=404)

        room_name = session.meeting_url.rstrip('/').split('/')[-1]
        is_owner = (request.user == session.teacher)

        token = create_meeting_token(
            room_name=room_name,
            user_name=request.user.username,
            is_owner=is_owner,
        )

        if not token:
            return Response({'detail': 'Failed to generate token.'}, status=502)

        return Response({
            'token': token,
            'meeting_url': session.meeting_url,
            'room_name': room_name,
        })
