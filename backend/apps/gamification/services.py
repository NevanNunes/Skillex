# apps/gamification/services.py
"""
Core XP & badge award engine.
Called from session, review, and community services.
"""
import math
from django.db.models import Sum
from .models import XPTransaction, Badge, UserBadge

# ──────────────────────────────────────────
# XP amounts per action (from Stage 1 spec)
# ──────────────────────────────────────────
XP_TABLE = {
    'session_completed_mentor':  50,
    'session_completed_learner': 30,
    'answer_accepted':           20,
    'post_upvoted':              5,
    'comment_upvoted':           3,
    'profile_completed':         25,
    'login_streak_7d':           15,
    'post_created':              10,
    'comment_created':           5,
    'review_submitted':          10,
}


def deduct_xp(user, action, reference_id=None):
    """
    Reverse XP for a given action (e.g., when an upvote is removed).
    Creates a negative XPTransaction and recalculates totals.
    """
    xp_amount = XP_TABLE.get(action, 0)
    if xp_amount == 0:
        return None

    tx = XPTransaction.objects.create(
        user=user,
        action=f'{action}_reversed',
        xp_amount=-xp_amount,
        reference_id=reference_id,
    )

    # Recalculate total XP from the ledger (source of truth)
    total_xp = XPTransaction.objects.filter(user=user).aggregate(
        total=Sum('xp_amount')
    )['total'] or 0
    total_xp = max(0, total_xp)  # XP can't go negative

    user.xp = total_xp
    user.teacher_level = _compute_level(total_xp)
    user.learner_level = _compute_level(total_xp)
    user.save(update_fields=['xp', 'teacher_level', 'learner_level'])

    return tx


def award_xp(user, action, reference_id=None):
    """
    Award XP for a given action.
    Creates an XPTransaction, updates user.xp, and checks badge criteria.
    """
    xp_amount = XP_TABLE.get(action, 0)
    if xp_amount == 0:
        return None

    tx = XPTransaction.objects.create(
        user=user,
        action=action,
        xp_amount=xp_amount,
        reference_id=reference_id,
    )

    # Recalculate total XP from the ledger (source of truth)
    total_xp = XPTransaction.objects.filter(user=user).aggregate(
        total=Sum('xp_amount')
    )['total'] or 0

    # Update user's cached XP and levels
    user.xp = total_xp
    user.teacher_level = _compute_level(total_xp)
    user.learner_level = _compute_level(total_xp)
    user.save(update_fields=['xp', 'teacher_level', 'learner_level'])

    # Check badge criteria
    _check_badges(user, action)

    return tx


def _compute_level(xp):
    """
    Level thresholds from the spec:
    Level 1 = 0, Level 2 = 100, Level 3 = 300, Level 4 = 600, Level 5 = 1000
    Generic formula for higher levels: floor(1 + sqrt(xp / 50))
    """
    thresholds = [0, 100, 300, 600, 1000]
    for level, threshold in enumerate(thresholds, start=1):
        if xp < threshold:
            return level - 1
    # Beyond level 5, use the formula
    return max(5, math.floor(1 + math.sqrt(xp / 50)))


def _check_badges(user, action):
    """
    Check all badge definitions whose criteria_action matches the current action.
    If the user has reached the required count, award the badge.
    """
    badges = Badge.objects.filter(criteria_action=action)
    for badge in badges:
        # Already awarded?
        if UserBadge.objects.filter(user=user, badge=badge).exists():
            continue
        # Count how many times this action has been performed
        count = XPTransaction.objects.filter(user=user, action=action).count()
        if count >= badge.criteria_count:
            UserBadge.objects.create(user=user, badge=badge)
            # Send notification for new badge
            try:
                from apps.notification.services import notify_badge_earned
                notify_badge_earned(user, badge.name, badge.icon)
            except ImportError:
                pass


def get_user_gamification_summary(user):
    """Return the full gamification profile for a user."""
    total_xp = XPTransaction.objects.filter(user=user).aggregate(
        total=Sum('xp_amount')
    )['total'] or 0

    badges = UserBadge.objects.filter(user=user).select_related('badge').values(
        'badge__name', 'badge__description', 'badge__icon', 'awarded_at'
    )

    return {
        'xp': total_xp,
        'teacher_level': _compute_level(total_xp),
        'learner_level': _compute_level(total_xp),
        'badges': list(badges),
    }


def get_leaderboard(scope='global', college=None, limit=50):
    """
    Return ranked users by XP.
    scope='campus' requires a college filter.
    """
    from apps.users.models import User

    qs = User.objects.all()
    if scope == 'campus' and college:
        qs = qs.filter(college=college)

    qs = qs.order_by('-xp')[:limit]

    return [
        {
            'rank': idx + 1,
            'user': {
                'id': str(u.id),
                'username': u.username,
                'avatar': u.avatar.url if u.avatar else None,
                'reputation_score': u.reputation_score,
            },
            'xp': u.xp,
            'level': _compute_level(u.xp),
        }
        for idx, u in enumerate(qs)
    ]
