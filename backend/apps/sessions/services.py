# apps/sessions/services.py
from django.utils import timezone
from .models import Session
from apps.matching.models import Match

def book_session(match: Match, scheduled_at, duration_minutes: int) -> Session:
    if match.status != 'accepted':
        raise ValueError("Can only book sessions for accepted matches.")
    if scheduled_at <= timezone.now():
        raise ValueError("Session must be scheduled in the future.")

    return Session.objects.create(
        match=match,
        teacher=match.teacher,
        learner=match.learner,
        scheduled_at=scheduled_at,
        duration_minutes=duration_minutes,
        status='pending',
    )

def confirm_session(session: Session, user) -> Session:
    if user not in [session.teacher, session.learner]:
        raise PermissionError("Not a participant.")
    session.status = 'confirmed'
    session.save(update_fields=['status'])
    return session

def cancel_session(session: Session, user, reason: str = '') -> Session:
    if user not in [session.teacher, session.learner]:
        raise PermissionError("Not a participant.")
    if session.status == 'completed':
        raise ValueError("Cannot cancel a completed session.")
    session.status = 'cancelled'
    session.cancelled_by = user
    session.cancel_reason = reason
    session.save(update_fields=['status', 'cancelled_by', 'cancel_reason'])
    # Fix #5: Clean up Daily.co room if one was created
    if session.meeting_url:
        try:
            from apps.integrations.daily_service import delete_room
            room_name = session.meeting_url.rstrip('/').split('/')[-1]
            delete_room(room_name)
        except ImportError:
            pass
    return session

def complete_session(session: Session) -> Session:
    """Called manually or by a scheduled Celery task after scheduled_at + duration passes."""
    session.status = 'completed'
    session.save(update_fields=['status'])
    return session