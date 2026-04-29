# apps/gamification/models.py
import uuid
from django.db import models
from apps.users.models import User


class XPTransaction(models.Model):
    """
    Immutable ledger of every XP award.
    Enables auditing and prevents double-counting.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='xp_transactions')
    action = models.CharField(max_length=50, help_text='Action that triggered this XP award.')
    xp_amount = models.IntegerField(help_text='XP awarded (positive) or deducted (negative).')
    reference_id = models.UUIDField(
        null=True, blank=True,
        help_text='Optional FK to the session/post/comment that triggered this.'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', '-created_at']),
            models.Index(fields=['action']),
        ]

    def __str__(self):
        return f'{self.user.username} +{self.xp_amount} XP ({self.action})'


class Badge(models.Model):
    """
    Badge definitions — created once, then awarded to users.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(max_length=300)
    icon = models.CharField(max_length=50, default='🏆', help_text='Emoji or icon class name.')
    criteria_action = models.CharField(
        max_length=50,
        help_text='The action type that counts toward earning this badge.'
    )
    criteria_count = models.PositiveIntegerField(
        help_text='How many times the action must occur.'
    )

    class Meta:
        ordering = ['name']

    def __str__(self):
        return f'{self.icon} {self.name}'


class UserBadge(models.Model):
    """Tracks which badges each user has earned."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='earned_badges')
    badge = models.ForeignKey(Badge, on_delete=models.CASCADE, related_name='holders')
    awarded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'badge')
        ordering = ['-awarded_at']

    def __str__(self):
        return f'{self.user.username} — {self.badge.name}'
