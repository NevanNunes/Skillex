# apps/sessions/serializers.py
from rest_framework import serializers
from django.utils import timezone
from .models import Session

class SessionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Session
        fields = ['id', 'match', 'teacher', 'learner', 'scheduled_at',
                  'duration_minutes', 'status', 'meeting_url', 'created_at']
        read_only_fields = ['id', 'teacher', 'learner', 'status', 'created_at']

class BookSessionSerializer(serializers.Serializer):
    match_id = serializers.UUIDField()
    scheduled_at = serializers.DateTimeField()
    duration_minutes = serializers.IntegerField(min_value=30, max_value=180)

    def validate_scheduled_at(self, value):
        if value <= timezone.now():
            raise serializers.ValidationError("Must be in the future.")
        return value

class CancelSessionSerializer(serializers.Serializer):
    reason = serializers.CharField(required=False, allow_blank=True)


class SessionFeedbackSerializer(serializers.Serializer):
    """Used when submitting post-session feedback via the 'feedback' action."""
    rating = serializers.IntegerField(min_value=1, max_value=5)
    comment = serializers.CharField(required=False, allow_blank=True)

from .models import StudyCircle

class StudyCircleSerializer(serializers.ModelSerializer):
    participants_count = serializers.SerializerMethodField()

    class Meta:
        model = StudyCircle
        fields = ['id', 'teacher', 'skill', 'title', 'description', 'scheduled_at',
                  'duration_minutes', 'max_participants', 'status', 'meeting_url',
                  'participants_count', 'created_at']
        read_only_fields = ['id', 'teacher', 'status', 'meeting_url', 'created_at']

    def get_participants_count(self, obj):
        return obj.participants.count()
