# apps/notification/services.py
"""
Central notification service — call from anywhere in the app
to create notifications for users.
"""
from .models import Notification


def notify(user, notification_type, title, message, payload=None, channel='in_app'):
    """
    Create a notification for a user.

    Args:
        user: User instance
        notification_type: one of Notification.TYPE_CHOICES values
        title: short title (max 200 chars)
        message: body text (max 500 chars)
        payload: optional dict with contextual IDs
        channel: 'in_app', 'email', or 'push'

    Returns:
        Notification instance
    """
    return Notification.objects.create(
        user=user,
        notification_type=notification_type,
        title=title,
        message=message,
        payload=payload or {},
        channel=channel,
    )


def notify_match(user, match_user_name, match_id):
    """Notify a user about a new match."""
    return notify(
        user=user,
        notification_type='new_match',
        title='You have a new match!',
        message=f'{match_user_name} wants to learn from you.',
        payload={'match_id': str(match_id)},
    )


def notify_session_scheduled(user, partner_name, session_id, scheduled_at):
    """Notify about a newly scheduled session."""
    return notify(
        user=user,
        notification_type='session_scheduled',
        title='Session scheduled',
        message=f'Your session with {partner_name} is scheduled for {scheduled_at.strftime("%b %d at %I:%M %p")}.',
        payload={'session_id': str(session_id)},
    )


def notify_session_confirmed(user, partner_name, session_id, scheduled_at):
    """Notify about a confirmed session."""
    return notify(
        user=user,
        notification_type='session_confirmed',
        title='Session confirmed',
        message=f'Your session with {partner_name} on {scheduled_at.strftime("%b %d at %I:%M %p")} is confirmed.',
        payload={'session_id': str(session_id)},
    )


def notify_session_cancelled(user, partner_name, session_id):
    """Notify about a cancelled session."""
    return notify(
        user=user,
        notification_type='session_cancelled',
        title='Session cancelled',
        message=f'Your session with {partner_name} has been cancelled.',
        payload={'session_id': str(session_id)},
    )


def notify_badge_earned(user, badge_name, badge_icon):
    """Notify a user when they earn a new badge."""
    return notify(
        user=user,
        notification_type='badge_earned',
        title=f'Badge earned: {badge_icon} {badge_name}',
        message=f'Congratulations! You earned the "{badge_name}" badge.',
        payload={'badge_name': badge_name},
    )


def notify_answer_accepted(user, post_title, post_id):
    """Notify when a user's answer is accepted."""
    return notify(
        user=user,
        notification_type='answer_accepted',
        title='Your answer was accepted!',
        message=f'Your answer on "{post_title[:80]}" was marked as the accepted answer.',
        payload={'post_id': str(post_id)},
    )


def get_unread_count(user):
    """Return the count of unread notifications for a user."""
    return Notification.objects.filter(user=user, is_read=False).count()
