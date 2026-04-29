# apps/chat/tests.py
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from apps.users.models import User
from apps.skills.models import SkillCategory, Skill, UserSkillTeach
from apps.matching.models import Match
from apps.notification.models import Notification
from .models import ChatRoom, Message


class ChatTests(TestCase):
    """Test chat room and message functionality."""

    def setUp(self):
        self.teacher = User.objects.create_user(email='t@ex.com', username='teacher', password='Pass1234!')
        self.learner = User.objects.create_user(email='l@ex.com', username='learner', password='Pass1234!')
        self.outsider = User.objects.create_user(email='o@ex.com', username='outsider', password='Pass1234!')
        cat = SkillCategory.objects.create(name='Tech', slug='tech')
        skill = Skill.objects.create(name='Python', slug='python', category=cat)
        ts = UserSkillTeach.objects.create(user=self.teacher, skill=skill, proficiency_level='expert')
        self.match = Match.objects.create(
            teacher=self.teacher, learner=self.learner,
            teach_skill=ts, score=0.9, status='accepted',
        )
        first, second = sorted([self.teacher, self.learner], key=lambda u: str(u.id))
        self.room = ChatRoom.objects.create(teacher=first, learner=second)
        self.msg = Message.objects.create(
            room=self.room, sender=self.teacher, content='Hello!'
        )

    def test_list_chat_rooms(self):
        client = APIClient()
        client.force_authenticate(user=self.teacher)
        res = client.get('/api/chat/rooms/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)

    def test_list_messages_in_room(self):
        client = APIClient()
        client.force_authenticate(user=self.learner)
        res = client.get(f'/api/chat/rooms/{self.room.id}/messages/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)

    def test_send_message(self):
        client = APIClient()
        client.force_authenticate(user=self.learner)
        res = client.post(f'/api/chat/rooms/{self.room.id}/send/', {
            'content': 'Hi teacher!',
        })
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Message.objects.count(), 2)

    def test_send_message_creates_notification_for_recipient(self):
        client = APIClient()
        client.force_authenticate(user=self.learner)
        client.post(f'/api/chat/rooms/{self.room.id}/send/', {'content': 'Ping!'}, format='json')
        self.assertTrue(
            Notification.objects.filter(
                user=self.teacher,
                notification_type='new_message',
            ).exists()
        )

    def test_mark_messages_read(self):
        client = APIClient()
        client.force_authenticate(user=self.learner)
        res = client.post(f'/api/chat/rooms/{self.room.id}/read/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.msg.refresh_from_db()
        self.assertTrue(self.msg.is_read)
