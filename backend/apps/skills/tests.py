# apps/skills/tests.py
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from apps.users.models import User
from .models import SkillCategory, Skill, UserSkillTeach, UserSkillLearn


class SkillCatalogTests(TestCase):
    """Test the public skill listing."""

    def setUp(self):
        self.cat = SkillCategory.objects.create(name='Programming', slug='programming')
        self.skill = Skill.objects.create(name='Python', slug='python', category=self.cat)
        self.client = APIClient()

    def test_list_skills_unauthenticated(self):
        """The skill catalog should be publicly accessible."""
        res = self.client.get('/api/skills/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)

    def test_skill_search(self):
        res = self.client.get('/api/skills/?search=Python')
        self.assertEqual(res.status_code, status.HTTP_200_OK)


class TeachSkillTests(TestCase):
    """Test CRUD on teach skills."""

    def setUp(self):
        self.user = User.objects.create_user(email='t@example.com', username='teacher', password='Pass1234!')
        self.cat = SkillCategory.objects.create(name='Music', slug='music')
        self.skill = Skill.objects.create(name='Guitar', slug='guitar', category=self.cat)
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def test_add_teach_skill(self):
        res = self.client.post('/api/skills/teach/', {
            'skill_id': str(self.skill.id),
            'proficiency_level': 'expert',
            'description': 'Teaching guitar for 5 years',
            'hourly_rate': 30,
        })
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(UserSkillTeach.objects.count(), 1)

    def test_duplicate_teach_skill(self):
        """A user should not be able to teach the same skill twice."""
        UserSkillTeach.objects.create(user=self.user, skill=self.skill, proficiency_level='expert')
        from django.db import IntegrityError
        with self.assertRaises(IntegrityError):
            UserSkillTeach.objects.create(user=self.user, skill=self.skill, proficiency_level='intermediate')

    def test_list_my_teach_skills(self):
        UserSkillTeach.objects.create(user=self.user, skill=self.skill, proficiency_level='expert')
        res = self.client.get('/api/skills/teach/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)

    def test_delete_teach_skill(self):
        ts = UserSkillTeach.objects.create(user=self.user, skill=self.skill, proficiency_level='expert')
        res = self.client.delete(f'/api/skills/teach/{ts.id}/')
        self.assertEqual(res.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(UserSkillTeach.objects.count(), 0)


class LearnSkillTests(TestCase):
    """Test CRUD on learn skills."""

    def setUp(self):
        self.user = User.objects.create_user(email='l@example.com', username='learner', password='Pass1234!')
        self.cat = SkillCategory.objects.create(name='Design', slug='design')
        self.skill = Skill.objects.create(name='Figma', slug='figma', category=self.cat)
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def test_add_learn_skill(self):
        res = self.client.post('/api/skills/learn/', {
            'skill_id': str(self.skill.id),
            'current_level': 'beginner',
        })
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)

    def test_duplicate_learn_skill(self):
        UserSkillLearn.objects.create(user=self.user, skill=self.skill, current_level='beginner')
        from django.db import IntegrityError
        with self.assertRaises(IntegrityError):
            UserSkillLearn.objects.create(user=self.user, skill=self.skill, current_level='intermediate')
