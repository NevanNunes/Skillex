# apps/users/models.py
import uuid
from django.db import models
from django.contrib.auth.models import AbstractUser
from django.core.validators import MinValueValidator, MaxValueValidator


class User(AbstractUser):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True)
    bio = models.TextField(blank=True, max_length=500)
    avatar = models.ImageField(upload_to='avatars/', blank=True, null=True)
    timezone = models.CharField(max_length=50, default='UTC')
    is_verified = models.BooleanField(default=False)
    reputation_score = models.FloatField(default=0.0)

    # Profile fields
    college = models.CharField(max_length=200, blank=True)
    year = models.PositiveSmallIntegerField(null=True, blank=True)
    branch = models.CharField(max_length=100, blank=True)

    # Gamification fields
    xp = models.IntegerField(default=0)
    teacher_level = models.PositiveIntegerField(default=1)
    learner_level = models.PositiveIntegerField(default=1)

    # Moderation
    role = models.CharField(
        max_length=20,
        choices=[('user', 'User'), ('moderator', 'Moderator'), ('admin', 'Admin')],
        default='user',
    )

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username']

    class Meta:
        indexes = [
            models.Index(fields=['email']),
            models.Index(fields=['reputation_score']),
            models.Index(fields=['-xp']),
            models.Index(fields=['college']),
        ]

    def __str__(self):
        return self.email


class AvailabilitySlot(models.Model):
    """
    Recurring weekly availability for a user.
    dayOfWeek: 0=Sunday … 6=Saturday
    startTime/endTime: 'HH:MM' in 24-hour format
    """
    MODE_CHOICES = [
        ('online', 'Online'),
        ('offline', 'Offline'),
        ('hybrid', 'Hybrid'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='availability')
    day_of_week = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(0), MaxValueValidator(6)],
        help_text='0=Sunday, 1=Monday, … 6=Saturday',
    )
    start_time = models.TimeField(help_text='Start time (HH:MM)')
    end_time = models.TimeField(help_text='End time (HH:MM)')
    mode = models.CharField(max_length=10, choices=MODE_CHOICES, default='online')

    class Meta:
        ordering = ['day_of_week', 'start_time']
        indexes = [
            models.Index(fields=['user', 'day_of_week']),
        ]

    def __str__(self):
        days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
        return f'{self.user.username} — {days[self.day_of_week]} {self.start_time}-{self.end_time}'