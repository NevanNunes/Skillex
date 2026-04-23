# apps/reviews/tests.py
from django.test import TestCase
from django.utils import timezone
from datetime import timedelta
from rest_framework.test import APIClient
from rest_framework import status as http_status
from apps.users.models import User
from apps.skills.models import SkillCategory, Skill, UserSkillTeach
from apps.matching.models import Match
from apps.sessions.models import Session
from .models import Review
from .services import create_review


class ReviewServiceTests(TestCase):
    """Test review creation and reputation update."""

    def setUp(self):
        self.teacher = User.objects.create_user(email='t@ex.com', username='t', password='Pass1234!')
        self.learner = User.objects.create_user(email='l@ex.com', username='l', password='Pass1234!')
        cat = SkillCategory.objects.create(name='Tech', slug='tech')
        skill = Skill.objects.create(name='Java', slug='java', category=cat)
        ts = UserSkillTeach.objects.create(user=self.teacher, skill=skill, proficiency_level='expert')
        self.match = Match.objects.create(
            teacher=self.teacher, learner=self.learner,
            teach_skill=ts, score=0.8, status='accepted',
        )
        self.session = Session.objects.create(
            match=self.match, teacher=self.teacher, learner=self.learner,
            scheduled_at=timezone.now() + timedelta(days=1),
            duration_minutes=60, status='completed',
        )

    def test_create_review(self):
        review = create_review(
            reviewer=self.learner, session_id=str(self.session.id),
            rating=5, comment='Great session!',
        )
        self.assertEqual(review.rating, 5)
        self.assertEqual(review.reviewer, self.learner)
        self.assertEqual(review.reviewee, self.teacher)

    def test_review_updates_reputation(self):
        create_review(
            reviewer=self.learner, session_id=str(self.session.id),
            rating=4, comment='Good',
        )
        self.teacher.refresh_from_db()
        self.assertEqual(self.teacher.reputation_score, 4.0)


class ReviewAPITests(TestCase):
    """Test review API endpoints."""

    def setUp(self):
        self.teacher = User.objects.create_user(email='t@ex.com', username='t', password='Pass1234!')
        self.learner = User.objects.create_user(email='l@ex.com', username='l', password='Pass1234!')
        cat = SkillCategory.objects.create(name='Tech', slug='tech')
        skill = Skill.objects.create(name='Java', slug='java', category=cat)
        ts = UserSkillTeach.objects.create(user=self.teacher, skill=skill, proficiency_level='expert')
        self.match = Match.objects.create(
            teacher=self.teacher, learner=self.learner,
            teach_skill=ts, score=0.8, status='accepted',
        )
        self.session = Session.objects.create(
            match=self.match, teacher=self.teacher, learner=self.learner,
            scheduled_at=timezone.now() + timedelta(days=1),
            duration_minutes=60, status='completed',
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.learner)

    def test_create_review_api(self):
        res = self.client.post('/api/reviews/', {
            'session_id': str(self.session.id),
            'rating': 5,
            'comment': 'Excellent!',
        })
        self.assertEqual(res.status_code, http_status.HTTP_201_CREATED)

    def test_list_user_reviews(self):
        create_review(self.learner, str(self.session.id), 4, 'Good')
        res = self.client.get(f'/api/reviews/user/{self.teacher.username}/')
        self.assertEqual(res.status_code, http_status.HTTP_200_OK)

    def test_list_reviews_nonexistent_user(self):
        res = self.client.get('/api/reviews/user/nonexistent/')
        self.assertEqual(res.status_code, http_status.HTTP_404_NOT_FOUND)
