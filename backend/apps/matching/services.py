# apps/matching/services.py
from django.db.models import Q
from apps.skills.models import UserSkillTeach, UserSkillLearn
from apps.users.models import User
from .models import Match

LEVEL_MAP = {'beginner': 1, 'intermediate': 2, 'expert': 3}

WEIGHTS = {
    'skill_level':  0.40,
    'reputation':   0.30,
    'completion':   0.30,
}

def _skill_level_score(teacher_level: str, learner_level: str) -> float:
    diff = abs(LEVEL_MAP[teacher_level] - LEVEL_MAP[learner_level])
    return max(0.0, 1.0 - diff * 0.4)

def _completion_rate(teacher: User) -> float:
    total = teacher.matches_as_teacher.filter(
        status__in=['accepted', 'rejected']
    ).count()
    if total == 0:
        return 0.5   # neutral for new users
    completed = teacher.sessions_as_teacher.filter(status='completed').count()
    return min(completed / total, 1.0)

def compute_score(teach_slot: UserSkillTeach, learner_level: str) -> float:
    return (
        _skill_level_score(teach_slot.proficiency_level, learner_level) * WEIGHTS['skill_level'] +
        min(teach_slot.user.reputation_score / 5.0, 1.0)                * WEIGHTS['reputation'] +
        _completion_rate(teach_slot.user)                                * WEIGHTS['completion']
    )

def refresh_matches_for_learner(learner: User) -> None:
    """
    Run this when a user adds/updates a learn skill.
    Called directly in views (MVP) or via Celery task (production).
    """
    for learn_skill in learner.wants_to_learn.select_related('skill'):
        candidates = UserSkillTeach.objects.filter(
            skill=learn_skill.skill,
            is_active=True,
        ).exclude(
            user=learner
        ).exclude(
            # skip already accepted/rejected
            Q(user__matches_as_teacher__learner=learner) &
            Q(user__matches_as_teacher__status__in=['accepted', 'rejected'])
        ).select_related('user')

        for teach_slot in candidates:
            score = compute_score(teach_slot, learn_skill.current_level)
            Match.objects.update_or_create(
                teacher=teach_slot.user,
                learner=learner,
                teach_skill=teach_slot,
                defaults={'score': score, 'status': 'pending'},
            )