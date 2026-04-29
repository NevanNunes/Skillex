# apps/users/slot_overlap.py
"""
Slot Overlap Algorithm — computes overlapping availability windows
between two users for the next N days, excluding already-booked sessions.

Used by:
  - GET /api/calendar/overlap/<userId>/
  - Session booking modal (frontend)
"""
from datetime import datetime, timedelta, time as dt_time


def _time_to_minutes(t):
    """Convert a time object to minutes since midnight."""
    return t.hour * 60 + t.minute


def _minutes_to_time(m):
    """Convert minutes since midnight back to a time object."""
    return dt_time(hour=m // 60, minute=m % 60)


def get_overlapping_slots(user_a, user_b, confirmed_sessions=None, days_ahead=14):
    """
    Compute overlapping availability windows between two users.

    Args:
        user_a: User instance (with prefetched 'availability')
        user_b: User instance (with prefetched 'availability')
        confirmed_sessions: QuerySet or list of Session objects (status='confirmed')
                           involving either user
        days_ahead: Number of days to look ahead (default 14)

    Returns:
        List of dicts: [{ "start": datetime, "end": datetime, "mode": str }, ...]
    """
    if confirmed_sessions is None:
        confirmed_sessions = []

    # Prefetch availability slots grouped by day_of_week
    slots_a = {}
    for slot in user_a.availability.all():
        slots_a.setdefault(slot.day_of_week, []).append(slot)

    slots_b = {}
    for slot in user_b.availability.all():
        slots_b.setdefault(slot.day_of_week, []).append(slot)

    now = datetime.now()
    windows = []

    for day_offset in range(days_ahead):
        target_date = (now + timedelta(days=day_offset)).date()
        dow = target_date.isoweekday() % 7  # Convert: Mon=1..Sun=7 → Sun=0..Sat=6

        day_slots_a = slots_a.get(dow, [])
        day_slots_b = slots_b.get(dow, [])

        for sa in day_slots_a:
            for sb in day_slots_b:
                # Find overlap in minutes
                overlap_start = max(
                    _time_to_minutes(sa.start_time),
                    _time_to_minutes(sb.start_time),
                )
                overlap_end = min(
                    _time_to_minutes(sa.end_time),
                    _time_to_minutes(sb.end_time),
                )

                if overlap_start >= overlap_end:
                    continue  # No overlap

                # Minimum 30-minute window to be useful
                if (overlap_end - overlap_start) < 30:
                    continue

                window_start = datetime.combine(target_date, _minutes_to_time(overlap_start))
                window_end = datetime.combine(target_date, _minutes_to_time(overlap_end))

                # Skip windows in the past
                if window_end <= now:
                    continue

                # Check if any confirmed session conflicts
                is_blocked = any(
                    _sessions_conflict(s, window_start, window_end, user_a, user_b)
                    for s in confirmed_sessions
                )
                if is_blocked:
                    continue

                # Determine mode compatibility
                mode = _resolve_mode(sa.mode, sb.mode)

                windows.append({
                    'start': window_start.isoformat(),
                    'end': window_end.isoformat(),
                    'duration_minutes': overlap_end - overlap_start,
                    'mode': mode,
                    'day': target_date.strftime('%A'),
                    'date': target_date.isoformat(),
                })

    return windows


def _sessions_conflict(session, window_start, window_end, user_a, user_b):
    """Check if a confirmed session overlaps with a candidate window."""
    session_start = session.scheduled_at
    session_end = session.scheduled_at + timedelta(minutes=session.duration_minutes)

    # Must involve one of our users
    involved = session.teacher_id in (user_a.id, user_b.id) or \
               session.learner_id in (user_a.id, user_b.id)
    if not involved:
        return False

    # Check time overlap
    return session_start < window_end and session_end > window_start


def _resolve_mode(mode_a, mode_b):
    """Determine the best mode when both users' preferences differ."""
    if mode_a == mode_b:
        return mode_a
    if 'hybrid' in (mode_a, mode_b):
        # Hybrid user accommodates the other's preference
        return mode_b if mode_a == 'hybrid' else mode_a
    # One online, one offline — default to online
    return 'online'
