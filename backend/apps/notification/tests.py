# apps/notification/tests.py
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from apps.users.models import User
from .models import Notification
from .services import notify, notify_match, get_unread_count


class NotificationServiceTests(TestCase):
    """Test notification creation and counting."""

    def setUp(self):
        self.user = User.objects.create_user(email='n@ex.com', username='n', password='Pass1234!')

    def test_create_notification(self):
        n = notify(self.user, 'system', 'Test', 'Hello')
        self.assertIsNotNone(n)
        self.assertFalse(n.is_read)

    def test_notify_match(self):
        n = notify_match(self.user, 'teacher_name', 'some-uuid')
        self.assertEqual(n.notification_type, 'new_match')

    def test_unread_count(self):
        notify(self.user, 'system', 'A', 'msg1')
        notify(self.user, 'system', 'B', 'msg2')
        self.assertEqual(get_unread_count(self.user), 2)

    def test_unread_count_excludes_read(self):
        n = notify(self.user, 'system', 'A', 'msg1')
        n.is_read = True
        n.save()
        notify(self.user, 'system', 'B', 'msg2')
        self.assertEqual(get_unread_count(self.user), 1)


class NotificationAPITests(TestCase):
    """Test notification API endpoints."""

    def setUp(self):
        self.user = User.objects.create_user(email='napi@ex.com', username='napi', password='Pass1234!')
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)
        self.n1 = notify(self.user, 'system', 'Title1', 'Msg1')
        self.n2 = notify(self.user, 'system', 'Title2', 'Msg2')

    def test_list_notifications(self):
        res = self.client.get('/api/notifications/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)

    def test_filter_unread(self):
        self.n1.is_read = True
        self.n1.save()
        res = self.client.get('/api/notifications/?read=false')
        self.assertEqual(res.status_code, status.HTTP_200_OK)

    def test_mark_single_read(self):
        res = self.client.put(f'/api/notifications/{self.n1.id}/read/')
        self.assertEqual(res.status_code, status.HTTP_204_NO_CONTENT)
        self.n1.refresh_from_db()
        self.assertTrue(self.n1.is_read)

    def test_mark_all_read(self):
        res = self.client.put('/api/notifications/read-all/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['updated'], 2)
        self.assertEqual(get_unread_count(self.user), 0)

    def test_unread_count_api(self):
        res = self.client.get('/api/notifications/unread-count/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['unread_count'], 2)

    def test_mark_other_users_notification(self):
        other = User.objects.create_user(email='other@ex.com', username='other', password='Pass1234!')
        n = notify(other, 'system', 'Secret', 'Not yours')
        res = self.client.put(f'/api/notifications/{n.id}/read/')
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)
