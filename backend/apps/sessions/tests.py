# apps/sessions/tests.py
from django.test import TestCase
from django.utils import timezone
from datetime import timedelta
from rest_framework.test import APIClient
from rest_framework import status
from apps.users.models import User
from apps.skills.models import SkillCategory, Skill, UserSkillTeach
from apps.matching.models import Match
from .models import Session
from .services import book_session, confirm_session, cancel_session, complete_session


class SessionServiceTests(TestCase):
    """Test session booking, confirming, cancelling, and completing."""

    def setUp(self):
        self.teacher = User.objects.create_user(email='t@ex.com', username='t', password='Pass1234!')
        self.learner = User.objects.create_user(email='l@ex.com', username='l', password='Pass1234!')
        self.outsider = User.objects.create_user(email='o@ex.com', username='o', password='Pass1234!')
        cat = SkillCategory.objects.create(name='Tech', slug='tech')
        skill = Skill.objects.create(name='Python', slug='python', category=cat)
        ts = UserSkillTeach.objects.create(user=self.teacher, skill=skill, proficiency_level='expert')
        self.match = Match.objects.create(
            teacher=self.teacher, learner=self.learner,
            teach_skill=ts, score=0.8, status='accepted',
        )

    def test_book_session_success(self):
        future = timezone.now() + timedelta(days=1)
        session = book_session(self.match, future, 60)
        self.assertEqual(session.status, 'pending')
        self.assertEqual(session.teacher, self.teacher)
        self.assertEqual(session.learner, self.learner)

    def test_book_session_past_time(self):
        past = timezone.now() - timedelta(days=1)
        with self.assertRaises(ValueError):
            book_session(self.match, past, 60)

    def test_book_session_non_accepted_match(self):
        self.match.status = 'pending'
        self.match.save()
        future = timezone.now() + timedelta(days=1)
        with self.assertRaises(ValueError):
            book_session(self.match, future, 60)

    def test_confirm_session(self):
        future = timezone.now() + timedelta(days=1)
        session = book_session(self.match, future, 60)
        confirmed = confirm_session(session, self.teacher)
        self.assertEqual(confirmed.status, 'confirmed')

    def test_confirm_by_outsider(self):
        future = timezone.now() + timedelta(days=1)
        session = book_session(self.match, future, 60)
        with self.assertRaises(PermissionError):
            confirm_session(session, self.outsider)

    def test_cancel_session(self):
        future = timezone.now() + timedelta(days=1)
        session = book_session(self.match, future, 60)
        cancelled = cancel_session(session, self.teacher, 'Schedule conflict')
        self.assertEqual(cancelled.status, 'cancelled')
        self.assertEqual(cancelled.cancelled_by, self.teacher)

    def test_cancel_completed_session(self):
        future = timezone.now() + timedelta(days=1)
        session = book_session(self.match, future, 60)
        session.status = 'completed'
        session.save()
        with self.assertRaises(ValueError):
            cancel_session(session, self.teacher)

    def test_complete_session(self):
        future = timezone.now() + timedelta(days=1)
        session = book_session(self.match, future, 60)
        session.status = 'confirmed'
        session.save()
        completed = complete_session(session)
        self.assertEqual(completed.status, 'completed')


class SessionAPITests(TestCase):
    """Test session API endpoints."""

    def setUp(self):
        self.teacher = User.objects.create_user(email='t@ex.com', username='t', password='Pass1234!')
        self.learner = User.objects.create_user(email='l@ex.com', username='l', password='Pass1234!')
        cat = SkillCategory.objects.create(name='Tech', slug='tech')
        skill = Skill.objects.create(name='Go', slug='go', category=cat)
        ts = UserSkillTeach.objects.create(user=self.teacher, skill=skill, proficiency_level='expert')
        self.match = Match.objects.create(
            teacher=self.teacher, learner=self.learner,
            teach_skill=ts, score=0.9, status='accepted',
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.learner)

    def test_book_session_api(self):
        future = (timezone.now() + timedelta(days=1)).isoformat()
        res = self.client.post('/api/sessions/book/', {
            'match_id': str(self.match.id),
            'scheduled_at': future,
            'duration_minutes': 60,
        })
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)

    def test_book_session_past_date(self):
        past = (timezone.now() - timedelta(days=1)).isoformat()
        res = self.client.post('/api/sessions/book/', {
            'match_id': str(self.match.id),
            'scheduled_at': past,
            'duration_minutes': 60,
        })
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_list_sessions(self):
        res = self.client.get('/api/sessions/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)

    def test_full_session_lifecycle(self):
        """Book -> Confirm -> Complete -> Feedback"""
        future = (timezone.now() + timedelta(days=1)).isoformat()
        book_res = self.client.post('/api/sessions/book/', {
            'match_id': str(self.match.id),
            'scheduled_at': future,
            'duration_minutes': 60,
        })
        session_id = book_res.data['id']

        # Teacher confirms
        teacher_client = APIClient()
        teacher_client.force_authenticate(user=self.teacher)
        confirm_res = teacher_client.post(f'/api/sessions/{session_id}/confirm/')
        self.assertEqual(confirm_res.status_code, status.HTTP_200_OK)

        # Teacher completes
        complete_res = teacher_client.post(f'/api/sessions/{session_id}/complete/')
        self.assertEqual(complete_res.status_code, status.HTTP_200_OK)

        # Learner gives feedback
        feedback_res = self.client.post(f'/api/sessions/{session_id}/feedback/', {
            'rating': 5, 'comment': 'Excellent!',
        })
        self.assertEqual(feedback_res.status_code, status.HTTP_200_OK)
