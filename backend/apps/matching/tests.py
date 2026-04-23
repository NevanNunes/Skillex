# apps/matching/tests.py
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from apps.users.models import User
from apps.skills.models import SkillCategory, Skill, UserSkillTeach, UserSkillLearn
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
    """Test match listing, accepting, and rejecting via API."""

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
        self.assertEqual(self.match.status, 'accepted')

    def test_reject_match(self):
        res = self.client.post(f'/api/matches/{self.match.id}/reject/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.match.refresh_from_db()
        self.assertEqual(self.match.status, 'rejected')

    def test_accept_creates_chatroom(self):
        from apps.chat.models import ChatRoom
        self.client.post(f'/api/matches/{self.match.id}/accept/')
        self.assertTrue(ChatRoom.objects.filter(match=self.match).exists())

    def test_teacher_cannot_accept(self):
        """Only the learner should be able to accept/reject."""
        client = APIClient()
        client.force_authenticate(user=self.teacher)
        res = client.post(f'/api/matches/{self.match.id}/accept/')
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)

    def test_invalid_action(self):
        res = self.client.post(f'/api/matches/{self.match.id}/invalid/')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
