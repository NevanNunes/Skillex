# apps/sessions/models.py
import uuid
from django.db import models
from apps.users.models import User
from apps.matching.models import Match

class Session(models.Model):
    STATUS = [
        ('pending', 'Pending'),
        ('confirmed', 'Confirmed'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
    ]
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    match = models.ForeignKey(Match, on_delete=models.CASCADE, related_name='sessions')
    teacher = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sessions_as_teacher')
    learner = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sessions_as_learner')
    scheduled_at = models.DateTimeField()
    duration_minutes = models.PositiveIntegerField(default=60)
    status = models.CharField(max_length=20, choices=STATUS, default='pending')
    meeting_url = models.URLField(blank=True)
    cancelled_by = models.ForeignKey(User, null=True, blank=True,
                                     on_delete=models.SET_NULL, related_name='cancelled_sessions')
    cancel_reason = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=['teacher', 'status']),
            models.Index(fields=['learner', 'status']),
            models.Index(fields=['scheduled_at']),
        ]