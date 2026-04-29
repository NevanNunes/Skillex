# apps/notification/models.py
import uuid
from django.db import models
from apps.users.models import User


class Notification(models.Model):
    """
    In-app notification delivered to a user.
    Created by services throughout the app (match, session, community, etc.).
    """
    TYPE_CHOICES = [
        ('new_match', 'New Match'),
        ('session_scheduled', 'Session Scheduled'),
        ('session_confirmed', 'Session Confirmed'),
        ('session_reminder', 'Session Reminder'),
        ('session_cancelled', 'Session Cancelled'),
        ('session_completed', 'Session Completed'),
        ('new_message', 'New Message'),
        ('post_reply', 'Post Reply'),
        ('answer_accepted', 'Answer Accepted'),
        ('badge_earned', 'Badge Earned'),
        ('level_up', 'Level Up'),
        ('community_invite', 'Community Invite'),
        ('report_action', 'Report Action'),
        ('system', 'System'),
    ]
    CHANNEL_CHOICES = [
        ('in_app', 'In-App'),
        ('email', 'Email'),
        ('push', 'Push'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications')
    notification_type = models.CharField(max_length=30, choices=TYPE_CHOICES)
    title = models.CharField(max_length=200)
    message = models.TextField(max_length=500)
    payload = models.JSONField(
        default=dict, blank=True,
        help_text='Extra data (e.g. session_id, match_id, post_id).',
    )
    channel = models.CharField(max_length=10, choices=CHANNEL_CHOICES, default='in_app')
    is_read = models.BooleanField(default=False)
    read_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', '-created_at']),
            models.Index(fields=['user', 'is_read']),
        ]

    def __str__(self):
        status = '✓' if self.is_read else '•'
        return f'{status} [{self.notification_type}] {self.title} → {self.user.username}'
