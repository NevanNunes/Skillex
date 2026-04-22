# apps/integrations/models.py
import uuid
from django.db import models
from apps.users.models import User


class GoogleCalendarToken(models.Model):
    """
    Stores Google OAuth2 tokens per user.
    Enables automatic calendar sync without re-authenticating.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='google_token')
    access_token = models.TextField()
    refresh_token = models.TextField(blank=True)
    expires_at = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f'GoogleToken({self.user.username})'
