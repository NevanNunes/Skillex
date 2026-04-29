# apps/integrations/google_calendar_service.py
"""
Google Calendar API integration.
Handles OAuth2 token exchange and creating/updating calendar events
for confirmed sessions.

Requires GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in settings.
"""
import logging
from datetime import timedelta
from urllib.parse import urlencode

import requests
from django.conf import settings

logger = logging.getLogger(__name__)

GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'
GOOGLE_CALENDAR_API = 'https://www.googleapis.com/calendar/v3'
SCOPES = 'https://www.googleapis.com/auth/calendar.events'


def get_authorization_url(state=''):
    """
    Build the Google OAuth2 authorization URL.
    Redirect the user here to grant calendar access.
    """
    params = {
        'client_id': settings.GOOGLE_CLIENT_ID,
        'redirect_uri': settings.GOOGLE_REDIRECT_URI,
        'response_type': 'code',
        'scope': SCOPES,
        'access_type': 'offline',
        'prompt': 'consent',
        'state': state,
    }
    return f'{GOOGLE_AUTH_URL}?{urlencode(params)}'


def exchange_code_for_tokens(code):
    """
    Exchange the authorization code for access and refresh tokens.

    Returns:
        dict with 'access_token', 'refresh_token', 'expires_in' or None
    """
    payload = {
        'client_id': settings.GOOGLE_CLIENT_ID,
        'client_secret': settings.GOOGLE_CLIENT_SECRET,
        'code': code,
        'grant_type': 'authorization_code',
        'redirect_uri': settings.GOOGLE_REDIRECT_URI,
    }

    try:
        resp = requests.post(GOOGLE_TOKEN_URL, data=payload, timeout=10)
        resp.raise_for_status()
        data = resp.json()
        return {
            'access_token': data['access_token'],
            'refresh_token': data.get('refresh_token'),
            'expires_in': data.get('expires_in', 3600),
        }
    except requests.RequestException as e:
        logger.error(f'Google token exchange failed: {e}')
        return None


def refresh_access_token(refresh_token):
    """Refresh an expired access token."""
    payload = {
        'client_id': settings.GOOGLE_CLIENT_ID,
        'client_secret': settings.GOOGLE_CLIENT_SECRET,
        'refresh_token': refresh_token,
        'grant_type': 'refresh_token',
    }
    try:
        resp = requests.post(GOOGLE_TOKEN_URL, data=payload, timeout=10)
        resp.raise_for_status()
        data = resp.json()
        return data.get('access_token')
    except requests.RequestException as e:
        logger.error(f'Google token refresh failed: {e}')
        return None


def create_calendar_event(access_token, session):
    """
    Create a Google Calendar event for a confirmed session.

    Args:
        access_token: valid Google OAuth2 access token
        session: Session model instance

    Returns:
        Google Calendar event ID or None
    """
    end_time = session.scheduled_at + timedelta(minutes=session.duration_minutes)

    event_body = {
        'summary': f'SkillEX Session: {session.match.teach_skill.skill.name}',
        'description': (
            f'Skill Exchange session between {session.teacher.username} (teacher) '
            f'and {session.learner.username} (learner).\n\n'
            f'Meeting URL: {session.meeting_url or "TBD"}'
        ),
        'start': {
            'dateTime': session.scheduled_at.isoformat(),
            'timeZone': 'UTC',
        },
        'end': {
            'dateTime': end_time.isoformat(),
            'timeZone': 'UTC',
        },
        'attendees': [
            {'email': session.teacher.email},
            {'email': session.learner.email},
        ],
        'reminders': {
            'useDefault': False,
            'overrides': [
                {'method': 'popup', 'minutes': 30},
                {'method': 'email', 'minutes': 60},
            ],
        },
        'conferenceData': {
            'entryPoints': [
                {
                    'entryPointType': 'video',
                    'uri': session.meeting_url or '',
                    'label': 'SkillEX Video Session',
                },
            ],
        } if session.meeting_url else {},
    }

    headers = {
        'Authorization': f'Bearer {access_token}',
        'Content-Type': 'application/json',
    }

    try:
        resp = requests.post(
            f'{GOOGLE_CALENDAR_API}/calendars/primary/events',
            json=event_body, headers=headers, timeout=10,
        )
        resp.raise_for_status()
        event = resp.json()
        logger.info(f'Calendar event created: {event["id"]}')
        return event['id']
    except requests.RequestException as e:
        logger.error(f'Google Calendar event creation failed: {e}')
        return None


def delete_calendar_event(access_token, event_id):
    """Delete a Google Calendar event (e.g. when session is cancelled)."""
    headers = {'Authorization': f'Bearer {access_token}'}
    try:
        resp = requests.delete(
            f'{GOOGLE_CALENDAR_API}/calendars/primary/events/{event_id}',
            headers=headers, timeout=10,
        )
        return resp.status_code in (200, 204, 410)
    except requests.RequestException as e:
        logger.error(f'Google Calendar event deletion failed: {e}')
        return False
