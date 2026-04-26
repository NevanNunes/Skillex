# apps/matching/models.py
import uuid
from django.db import models
from apps.users.models import User
from apps.skills.models import UserSkillTeach

class Match(models.Model):
    STATUS = [
        ('pending', 'Pending'),
        ('accepted', 'Accepted'),
        ('rejected', 'Rejected'),
        ('expired', 'Expired'),
    ]
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    teacher = models.ForeignKey(User, on_delete=models.CASCADE, related_name='matches_as_teacher')
    learner = models.ForeignKey(User, on_delete=models.CASCADE, related_name='matches_as_learner')
    teach_skill = models.ForeignKey(UserSkillTeach, on_delete=models.CASCADE)
    score = models.FloatField(default=0.0)
    teacher_accepted = models.BooleanField(default=False)
    learner_accepted = models.BooleanField(default=False)
    status = models.CharField(max_length=20, choices=STATUS, default='pending')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('teacher', 'learner', 'teach_skill')
        indexes = [
            models.Index(fields=['learner', 'status']),
            models.Index(fields=['score']),
        ]

    def __str__(self):
        return f"{self.learner} → {self.teacher} ({self.teach_skill.skill.name})"