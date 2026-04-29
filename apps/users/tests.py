# apps/users/tests.py
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from .models import User


class AuthTests(TestCase):
    """Test registration, login, token refresh, and logout."""

    def setUp(self):
        self.client = APIClient()
        self.register_url = '/api/auth/register/'
        self.login_url = '/api/auth/login/'
        self.refresh_url = '/api/auth/refresh/'
        self.logout_url = '/api/auth/logout/'

    def test_register_success(self):
        data = {'email': 'new@example.com', 'username': 'newuser', 'password': 'StrongPass123!'}
        res = self.client.post(self.register_url, data)
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertTrue(User.objects.filter(email='new@example.com').exists())

    def test_register_auto_username(self):
        """If username is omitted, it should be derived from the email."""
        data = {'email': 'auto@example.com', 'password': 'StrongPass123!'}
        res = self.client.post(self.register_url, data)
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(User.objects.get(email='auto@example.com').username, 'auto')

    def test_register_duplicate_email(self):
        User.objects.create_user(email='dup@example.com', username='dup', password='pass')
        data = {'email': 'dup@example.com', 'username': 'dup2', 'password': 'StrongPass123!'}
        res = self.client.post(self.register_url, data)
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_register_weak_password(self):
        data = {'email': 'weak@example.com', 'username': 'weakuser', 'password': '123'}
        res = self.client.post(self.register_url, data)
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_login_success(self):
        User.objects.create_user(email='login@example.com', username='login', password='StrongPass123!')
        res = self.client.post(self.login_url, {'email': 'login@example.com', 'password': 'StrongPass123!'})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn('access', res.data)
        self.assertIn('refresh', res.data)

    def test_login_wrong_password(self):
        User.objects.create_user(email='wrong@example.com', username='wrong', password='StrongPass123!')
        res = self.client.post(self.login_url, {'email': 'wrong@example.com', 'password': 'WrongPass!'})
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_token_refresh(self):
        User.objects.create_user(email='ref@example.com', username='ref', password='StrongPass123!')
        login = self.client.post(self.login_url, {'email': 'ref@example.com', 'password': 'StrongPass123!'})
        res = self.client.post(self.refresh_url, {'refresh': login.data['refresh']})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn('access', res.data)

    def test_logout_blacklists_token(self):
        User.objects.create_user(email='out@example.com', username='out', password='StrongPass123!')
        login = self.client.post(self.login_url, {'email': 'out@example.com', 'password': 'StrongPass123!'})
        res = self.client.post(self.logout_url, {'refresh': login.data['refresh']})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        # Try to use the blacklisted refresh token
        res2 = self.client.post(self.refresh_url, {'refresh': login.data['refresh']})
        self.assertEqual(res2.status_code, status.HTTP_401_UNAUTHORIZED)


class ProfileTests(TestCase):
    """Test user profile endpoints."""

    def setUp(self):
        self.user = User.objects.create_user(
            email='me@example.com', username='testuser', password='StrongPass123!',
            bio='Test bio', reputation_score=3.5
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def test_get_my_profile(self):
        res = self.client.get('/api/users/me/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['email'], 'me@example.com')
        self.assertEqual(res.data['bio'], 'Test bio')

    def test_update_my_profile(self):
        res = self.client.patch('/api/users/me/', {'bio': 'Updated bio'})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['bio'], 'Updated bio')

    def test_cannot_update_readonly_fields(self):
        """reputation_score, xp, and is_verified should be read-only."""
        res = self.client.patch('/api/users/me/', {
            'reputation_score': 5.0, 'xp': 9999, 'is_verified': True,
        })
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertEqual(self.user.reputation_score, 3.5)  # unchanged
        self.assertEqual(self.user.xp, 0)  # unchanged
        self.assertFalse(self.user.is_verified)  # unchanged

    def test_public_profile(self):
        public = self.client.get(f'/api/users/{self.user.username}/')
        self.assertEqual(public.status_code, status.HTTP_200_OK)
        self.assertNotIn('email', public.data)  # email should be hidden from public view

    def test_public_profile_404(self):
        res = self.client.get('/api/users/nonexistent/')
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)

    def test_unauthenticated_profile_denied(self):
        client = APIClient()
        res = client.get('/api/users/me/')
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)


class UserSearchTests(TestCase):
    def setUp(self):
        self.me = User.objects.create_user(
            email='me@example.com',
            username='searcher',
            password='StrongPass123!',
            college='Search University',
        )
        self.alice = User.objects.create_user(
            email='alice@example.com',
            username='alice.w',
            password='StrongPass123!',
            bio='Helps with React and design systems.',
            college='Search University',
        )
        User.objects.create_user(
            email='bob@example.com',
            username='bob.t',
            password='StrongPass123!',
            bio='Math tutor',
            college='Other College',
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.me)

    def test_search_people_by_username(self):
        res = self.client.get('/api/users/', {'search': 'alice'})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['count'], 1)
        self.assertEqual(res.data['results'][0]['username'], 'alice.w')

    def test_search_people_excludes_current_user(self):
        res = self.client.get('/api/users/', {'search': 'searcher'})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        usernames = [item['username'] for item in res.data['results']]
        self.assertNotIn('searcher', usernames)

    def test_search_people_requires_authentication(self):
        client = APIClient()
        res = client.get('/api/users/', {'search': 'alice'})
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)
