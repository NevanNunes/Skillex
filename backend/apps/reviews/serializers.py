# apps/reviews/serializers.py
from rest_framework import serializers
from .models import Review
from apps.sessions.models import Session

class ReviewSerializer(serializers.ModelSerializer):
    class Meta:
        model = Review
        fields = ['id', 'session', 'reviewer', 'reviewee', 'rating', 'comment', 'created_at']
        read_only_fields = ['id', 'reviewer', 'reviewee', 'created_at']

class CreateReviewSerializer(serializers.Serializer):
    session_id = serializers.UUIDField()
    rating = serializers.IntegerField(min_value=1, max_value=5)
    comment = serializers.CharField(required=False, allow_blank=True)

    def validate_session_id(self, value):
        try:
            session = Session.objects.get(id=value, status='completed')
        except Session.DoesNotExist:
            raise serializers.ValidationError("Session not found or not completed.")
        if hasattr(session, 'review'):
            raise serializers.ValidationError("This session already has a review.")
        return value