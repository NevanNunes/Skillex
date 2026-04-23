# apps/gamification/tests.py
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from apps.users.models import User
from .models import XPTransaction, Badge, UserBadge
from .services import award_xp, deduct_xp, _compute_level, get_user_gamification_summary


class XPAwardTests(TestCase):
    """Test XP awarding mechanics."""

    def setUp(self):
        self.user = User.objects.create_user(email='xp@ex.com', username='xp', password='Pass1234!')

    def test_award_xp_updates_user(self):
        award_xp(self.user, 'session_completed_mentor')
        self.user.refresh_from_db()
        self.assertEqual(self.user.xp, 50)

    def test_award_xp_creates_transaction(self):
        tx = award_xp(self.user, 'post_created')
        self.assertIsNotNone(tx)
        self.assertEqual(tx.xp_amount, 10)
        self.assertEqual(tx.action, 'post_created')

    def test_award_xp_unknown_action(self):
        tx = award_xp(self.user, 'nonexistent_action')
        self.assertIsNone(tx)

    def test_deduct_xp(self):
        award_xp(self.user, 'post_upvoted')  # +5
        deduct_xp(self.user, 'post_upvoted')  # -5
        self.user.refresh_from_db()
        self.assertEqual(self.user.xp, 0)

    def test_xp_cannot_go_negative(self):
        deduct_xp(self.user, 'session_completed_mentor')  # -50 from 0
        self.user.refresh_from_db()
        self.assertEqual(self.user.xp, 0)

    def test_multiple_awards_accumulate(self):
        award_xp(self.user, 'post_created')      # +10
        award_xp(self.user, 'comment_created')    # +5
        award_xp(self.user, 'review_submitted')   # +10
        self.user.refresh_from_db()
        self.assertEqual(self.user.xp, 25)


class LevelTests(TestCase):
    """Test level computation."""

    def test_level_1_at_zero(self):
        self.assertEqual(_compute_level(0), 1)

    def test_level_2_at_100(self):
        self.assertEqual(_compute_level(100), 2)

    def test_level_boundaries(self):
        self.assertEqual(_compute_level(99), 1)
        self.assertEqual(_compute_level(299), 2)
        self.assertEqual(_compute_level(300), 3)
        self.assertEqual(_compute_level(599), 3)
        self.assertEqual(_compute_level(600), 4)
        self.assertEqual(_compute_level(999), 4)
        self.assertEqual(_compute_level(1000), 5)

    def test_high_xp_formula(self):
        level = _compute_level(5000)
        self.assertGreaterEqual(level, 5)


class BadgeTests(TestCase):
    """Test badge awarding."""

    def setUp(self):
        self.user = User.objects.create_user(email='b@ex.com', username='b', password='Pass1234!')
        self.badge = Badge.objects.create(
            name='First Post!', description='Create your first post',
            icon='📝', criteria_action='post_created', criteria_count=1,
        )

    def test_badge_awarded_on_criteria(self):
        award_xp(self.user, 'post_created')
        self.assertTrue(UserBadge.objects.filter(user=self.user, badge=self.badge).exists())

    def test_badge_not_duplicated(self):
        award_xp(self.user, 'post_created')
        award_xp(self.user, 'post_created')
        self.assertEqual(UserBadge.objects.filter(user=self.user, badge=self.badge).count(), 1)

    def test_badge_not_awarded_prematurely(self):
        badge_10 = Badge.objects.create(
            name='Prolific Poster', description='Create 10 posts',
            icon='🏆', criteria_action='post_created', criteria_count=10,
        )
        for _ in range(9):
            award_xp(self.user, 'post_created')
        self.assertFalse(UserBadge.objects.filter(user=self.user, badge=badge_10).exists())
        award_xp(self.user, 'post_created')
        self.assertTrue(UserBadge.objects.filter(user=self.user, badge=badge_10).exists())


class GamificationAPITests(TestCase):
    """Test gamification API endpoints."""

    def setUp(self):
        self.user = User.objects.create_user(email='g@ex.com', username='g', password='Pass1234!')
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def test_gamification_me(self):
        res = self.client.get('/api/gamification/me/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn('xp', res.data)
        self.assertIn('teacher_level', res.data)
        self.assertIn('badges', res.data)

    def test_xp_history(self):
        award_xp(self.user, 'post_created')
        res = self.client.get('/api/gamification/xp-history/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)

    def test_badges_endpoint(self):
        res = self.client.get('/api/gamification/badges/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)

    def test_leaderboard(self):
        res = self.client.get('/api/gamification/leaderboard/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn('leaderboard', res.data)

    def test_leaderboard_limit(self):
        res = self.client.get('/api/gamification/leaderboard/?limit=5')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
