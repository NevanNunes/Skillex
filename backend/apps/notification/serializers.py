# apps/notification/serializers.py
from rest_framework import serializers
from .models import Notification


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = [
            'id', 'notification_type', 'title', 'message',
            'payload', 'channel', 'is_read', 'read_at', 'created_at',
        ]
        read_only_fields = fields


class NotificationSettingsSerializer(serializers.Serializer):
    """Update user notification preferences (future: push/email toggles)."""
    push_enabled = serializers.BooleanField(required=False, default=True)
    email_enabled = serializers.BooleanField(required=False, default=True)
