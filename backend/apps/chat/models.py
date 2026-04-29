# apps/chat/models.py
import uuid
from django.db import models
from django.db.models import F, Q
from apps.users.models import User

class ChatRoom(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    teacher = models.ForeignKey(User, on_delete=models.CASCADE, related_name='chat_rooms_as_teacher')
    learner = models.ForeignKey(User, on_delete=models.CASCADE, related_name='chat_rooms_as_learner')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=['teacher', 'learner'], name='unique_chatroom_teacher_learner'),
            models.CheckConstraint(
                condition=Q(teacher__lt=F('learner')),
                name='chatroom_teacher_lt_learner',
            ),
        ]
        indexes = [
            models.Index(fields=['teacher', 'learner']),
        ]

    def __str__(self):
        return f"{self.teacher.username} ↔ {self.learner.username}"

class Message(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    room = models.ForeignKey(ChatRoom, on_delete=models.CASCADE, related_name='messages')
    sender = models.ForeignKey(User, on_delete=models.CASCADE)
    content = models.TextField()
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [models.Index(fields=['room', 'created_at'])]
        ordering = ['created_at']