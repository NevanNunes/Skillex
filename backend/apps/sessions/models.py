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

class StudyCircle(models.Model):
    STATUS = [
        ('open', 'Open'),
        ('full', 'Full'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
    ]
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    teacher = models.ForeignKey(User, on_delete=models.CASCADE, related_name='study_circles_teaching')
    skill = models.ForeignKey('skills.Skill', on_delete=models.CASCADE, related_name='study_circles')
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    scheduled_at = models.DateTimeField()
    duration_minutes = models.PositiveIntegerField(default=60)
    max_participants = models.PositiveIntegerField(default=5)
    participants = models.ManyToManyField(User, related_name='study_circles_learning', blank=True)
    status = models.CharField(max_length=20, choices=STATUS, default='open')
    meeting_url = models.URLField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-scheduled_at']

    def __str__(self):
        return f"{self.title} by {self.teacher.username}"