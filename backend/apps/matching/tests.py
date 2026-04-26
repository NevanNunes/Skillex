# apps/matching/tests.py
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from apps.users.models import User
from apps.skills.models import SkillCategory, Skill, UserSkillTeach, UserSkillLearn
from apps.notification.models import Notification
from .models import Match
from .services import refresh_matches_for_learner, compute_score


class MatchingServiceTests(TestCase):
    """Test the core matching algorithm and scoring."""

    def setUp(self):
        self.teacher = User.objects.create_user(
            email='teach@example.com', username='teach', password='Pass1234!',
            reputation_score=4.0,
        )
        self.learner = User.objects.create_user(
            email='learn@example.com', username='learn', password='Pass1234!',
        )
        self.cat = SkillCategory.objects.create(name='Tech', slug='tech')
        self.skill = Skill.objects.create(name='Django', slug='django', category=self.cat)
        self.teach_slot = UserSkillTeach.objects.create(
            user=self.teacher, skill=self.skill,
            proficiency_level='expert', is_active=True,
        )
        self.learn_slot = UserSkillLearn.objects.create(
            user=self.learner, skill=self.skill, current_level='beginner',
        )

    def test_refresh_creates_matches(self):
        refresh_matches_for_learner(self.learner)
        self.assertEqual(Match.objects.count(), 1)
        match = Match.objects.first()
        self.assertEqual(match.teacher, self.teacher)
        self.assertEqual(match.learner, self.learner)
        self.assertEqual(match.status, 'pending')

    def test_refresh_creates_teacher_notification(self):
        refresh_matches_for_learner(self.learner)
        n = Notification.objects.get(user=self.teacher, notification_type='new_match')
        self.assertEqual(n.payload.get('match_id'), str(Match.objects.first().id))

    def test_refresh_does_not_duplicate_notification_for_existing_match(self):
        refresh_matches_for_learner(self.learner)
        refresh_matches_for_learner(self.learner)
        self.assertEqual(
            Notification.objects.filter(user=self.teacher, notification_type='new_match').count(),
            1,
        )

    def test_score_is_positive(self):
        score = compute_score(self.teach_slot, 'beginner')
        self.assertGreater(score, 0.0)
        self.assertLessEqual(score, 1.0)

    def test_no_self_match(self):
        """A user should not be matched with themselves."""
        UserSkillLearn.objects.create(
            user=self.teacher, skill=self.skill, current_level='beginner',
        )
        refresh_matches_for_learner(self.teacher)
        matches = Match.objects.filter(teacher=self.teacher, learner=self.teacher)
        self.assertEqual(matches.count(), 0)


class MatchAPITests(TestCase):
    """Test match listing, mutual accepting, and rejecting via API."""

    def setUp(self):
        self.teacher = User.objects.create_user(
            email='t@example.com', username='t', password='Pass1234!',
        )
        self.learner = User.objects.create_user(
            email='l@example.com', username='l', password='Pass1234!',
        )
        self.cat = SkillCategory.objects.create(name='Tech', slug='tech')
        self.skill = Skill.objects.create(name='React', slug='react', category=self.cat)
        self.teach_slot = UserSkillTeach.objects.create(
            user=self.teacher, skill=self.skill, proficiency_level='expert',
        )
        self.match = Match.objects.create(
            teacher=self.teacher, learner=self.learner,
            teach_skill=self.teach_slot, score=0.8, status='pending',
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.learner)

    def test_list_pending_matches(self):
        res = self.client.get('/api/matches/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)

    def test_accept_match(self):
        res = self.client.post(f'/api/matches/{self.match.id}/accept/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.match.refresh_from_db()
        self.assertEqual(self.match.status, 'pending')
        self.assertTrue(self.match.learner_accepted)
        self.assertFalse(self.match.teacher_accepted)

    def test_second_accept_finalizes_match(self):
        from apps.chat.models import ChatRoom
        self.client.post(f'/api/matches/{self.match.id}/accept/')

        teacher_client = APIClient()
        teacher_client.force_authenticate(user=self.teacher)
        res = teacher_client.post(f'/api/matches/{self.match.id}/accept/')

        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.match.refresh_from_db()
        self.assertEqual(self.match.status, 'accepted')
        self.assertTrue(self.match.learner_accepted)
        self.assertTrue(self.match.teacher_accepted)

        first, second = sorted([self.teacher, self.learner], key=lambda u: str(u.id))
        self.assertTrue(ChatRoom.objects.filter(teacher=first, learner=second).exists())

    def test_reject_match(self):
        res = self.client.post(f'/api/matches/{self.match.id}/reject/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.match.refresh_from_db()
        self.assertEqual(self.match.status, 'rejected')

    def test_first_accept_does_not_create_chatroom(self):
        from apps.chat.models import ChatRoom
        self.client.post(f'/api/matches/{self.match.id}/accept/')
        first, second = sorted([self.teacher, self.learner], key=lambda u: str(u.id))
        self.assertFalse(ChatRoom.objects.filter(teacher=first, learner=second).exists())

    def test_teacher_can_accept(self):
        client = APIClient()
        client.force_authenticate(user=self.teacher)
        res = client.post(f'/api/matches/{self.match.id}/accept/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)

    def test_teacher_can_list_pending_matches(self):
        client = APIClient()
        client.force_authenticate(user=self.teacher)
        res = client.get('/api/matches/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        rows = res.data['results'] if isinstance(res.data, dict) and 'results' in res.data else res.data
        self.assertEqual(len(rows), 1)
        self.assertEqual(str(rows[0]['id']), str(self.match.id))

    def test_accepted_match_list_is_empty_until_mutual_accept(self):
        res = self.client.get('/api/matches/accepted/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        rows = res.data['results'] if isinstance(res.data, dict) and 'results' in res.data else res.data
        self.assertEqual(len(rows), 0)

    def test_accepted_match_list_returns_mutually_accepted_match(self):
        self.client.post(f'/api/matches/{self.match.id}/accept/')

        teacher_client = APIClient()
        teacher_client.force_authenticate(user=self.teacher)
        teacher_client.post(f'/api/matches/{self.match.id}/accept/')

        res = self.client.get('/api/matches/accepted/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        rows = res.data['results'] if isinstance(res.data, dict) and 'results' in res.data else res.data
        self.assertEqual(len(rows), 1)
        self.assertEqual(str(rows[0]['id']), str(self.match.id))

    def test_invalid_action(self):
        res = self.client.post(f'/api/matches/{self.match.id}/invalid/')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
