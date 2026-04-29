# apps/gamification/management/commands/seed_badges.py
"""
Management command to seed default badge definitions.
Run: python manage.py seed_badges
"""
from django.core.management.base import BaseCommand
from apps.gamification.models import Badge


BADGE_DEFINITIONS = [
    {
        'name': 'First Session',
        'description': 'Completed your first learning session.',
        'icon': '🎓',
        'criteria_action': 'session_completed_learner',
        'criteria_count': 1,
    },
    {
        'name': 'Top Mentor',
        'description': 'Taught 10 sessions — you are a top mentor!',
        'icon': '🏅',
        'criteria_action': 'session_completed_mentor',
        'criteria_count': 10,
    },
    {
        'name': 'Community Helper',
        'description': 'Had 10 answers accepted by the community.',
        'icon': '💡',
        'criteria_action': 'answer_accepted',
        'criteria_count': 10,
    },
    {
        'name': 'Profile Complete',
        'description': 'Filled out your full profile — nice!',
        'icon': '✅',
        'criteria_action': 'profile_completed',
        'criteria_count': 1,
    },
    {
        'name': 'Consistency Streak',
        'description': 'Logged in for 7 consecutive days.',
        'icon': '🔥',
        'criteria_action': 'login_streak_7d',
        'criteria_count': 1,
    },
    {
        'name': 'Rising Star',
        'description': 'Received 50 upvotes on your posts.',
        'icon': '⭐',
        'criteria_action': 'post_upvoted',
        'criteria_count': 50,
    },
    {
        'name': 'Active Contributor',
        'description': 'Created 20 posts across communities.',
        'icon': '📝',
        'criteria_action': 'post_created',
        'criteria_count': 20,
    },
]


class Command(BaseCommand):
    help = 'Seed default badge definitions into the database.'

    def handle(self, *args, **options):
        created_count = 0
        for badge_data in BADGE_DEFINITIONS:
            _, created = Badge.objects.get_or_create(
                name=badge_data['name'],
                defaults=badge_data,
            )
            if created:
                created_count += 1
                self.stdout.write(self.style.SUCCESS(f'  Created badge: {badge_data["icon"]} {badge_data["name"]}'))
            else:
                self.stdout.write(f'  Already exists: {badge_data["name"]}')

        self.stdout.write(self.style.SUCCESS(f'\nDone. {created_count} new badges seeded.'))
