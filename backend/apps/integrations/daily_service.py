# apps/integrations/daily_service.py
"""
Daily.co WebRTC integration service.
Creates video rooms for confirmed sessions and generates
time-limited meeting tokens.

Requires DAILY_API_KEY in settings/environment.
"""
import requests
import logging
from datetime import datetime, timedelta
from django.conf import settings

logger = logging.getLogger(__name__)

DAILY_API_URL = getattr(settings, 'DAILY_API_URL', 'https://api.daily.co/v1')


def _headers():
    return {
        'Authorization': f'Bearer {settings.DAILY_API_KEY}',
        'Content-Type': 'application/json',
    }


def create_room(session_id, scheduled_at, duration_minutes):
    """
    Create a Daily.co room for a session.

    Args:
        session_id: UUID of the Session
        scheduled_at: datetime when the session starts
        duration_minutes: how long the session lasts

    Returns:
        dict with 'name', 'url', 'id' or None on failure
    """
    if not settings.DAILY_API_KEY:
        logger.warning('DAILY_API_KEY not set — generating placeholder meeting URL')
        return {
            'name': f'skillex-{str(session_id)[:8]}',
            'url': f'https://skillex.daily.co/skillex-{str(session_id)[:8]}',
            'id': str(session_id),
        }

    # Room auto-expires 30 minutes after session ends
    expiry = scheduled_at + timedelta(minutes=duration_minutes + 30)

    payload = {
        'name': f'skillex-{str(session_id)[:8]}',
        'privacy': 'private',
        'properties': {
            'exp': int(expiry.timestamp()),
            'max_participants': 2,
            'enable_screenshare': True,
            'enable_chat': True,
            'enable_recording': 'local',
            'start_video_off': False,
            'start_audio_off': False,
            'lang': 'en',
        },
    }

    try:
        resp = requests.post(f'{DAILY_API_URL}/rooms', json=payload, headers=_headers(), timeout=10)
        resp.raise_for_status()
        data = resp.json()
        return {
            'name': data['name'],
            'url': data['url'],
            'id': data['id'],
        }
    except requests.RequestException as e:
        logger.error(f'Daily.co room creation failed: {e}')
        return None


def create_meeting_token(room_name, user_name, is_owner=False, expiry_minutes=120):
    """
    Generate a time-limited meeting token for a participant.

    Args:
        room_name: Daily.co room name
        user_name: display name in the call
        is_owner: whether this user can control the room
        expiry_minutes: how long the token is valid

    Returns:
        token string or None
    """
    if not settings.DAILY_API_KEY:
        return f'dev-token-{room_name}-{user_name}'

    payload = {
        'properties': {
            'room_name': room_name,
            'user_name': user_name,
            'is_owner': is_owner,
            'exp': int((datetime.utcnow() + timedelta(minutes=expiry_minutes)).timestamp()),
        },
    }

    try:
        resp = requests.post(
            f'{DAILY_API_URL}/meeting-tokens',
            json=payload, headers=_headers(), timeout=10,
        )
        resp.raise_for_status()
        return resp.json().get('token')
    except requests.RequestException as e:
        logger.error(f'Daily.co token creation failed: {e}')
        return None


def delete_room(room_name):
    """Delete a Daily.co room (cleanup after session ends)."""
    if not settings.DAILY_API_KEY:
        return True

    try:
        resp = requests.delete(
            f'{DAILY_API_URL}/rooms/{room_name}',
            headers=_headers(), timeout=10,
        )
        return resp.status_code in (200, 204, 404)
    except requests.RequestException as e:
        logger.error(f'Daily.co room deletion failed: {e}')
        return False
