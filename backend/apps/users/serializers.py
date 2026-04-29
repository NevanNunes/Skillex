# apps/users/serializers.py
from rest_framework import serializers
from django.contrib.auth.password_validation import validate_password
from .models import User, AvailabilitySlot


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, validators=[validate_password])
    username = serializers.CharField(required=False)

    class Meta:
        model = User
        fields = ['id', 'email', 'username', 'password', 'first_name', 'last_name']

    def create(self, validated_data):
        # Auto-generate a username from the email if not provided by the frontend
        if 'username' not in validated_data:
            validated_data['username'] = validated_data['email'].split('@')[0]
            
        return User.objects.create_user(**validated_data)


class AvailabilitySlotSerializer(serializers.ModelSerializer):
    class Meta:
        model = AvailabilitySlot
        fields = ['id', 'day_of_week', 'start_time', 'end_time', 'mode']
        read_only_fields = ['id']

    def validate(self, data):
        if data.get('start_time') and data.get('end_time'):
            if data['start_time'] >= data['end_time']:
                raise serializers.ValidationError('start_time must be before end_time.')
        return data


class AvailabilityBulkSerializer(serializers.Serializer):
    """Accepts a list of slots to replace the user's entire availability."""
    slots = AvailabilitySlotSerializer(many=True)


class UserProfileSerializer(serializers.ModelSerializer):
    availability = AvailabilitySlotSerializer(many=True, read_only=True)

    class Meta:
        model = User
        fields = [
            'id', 'email', 'username', 'bio', 'avatar', 'timezone',
            'college', 'year', 'branch',
            'reputation_score', 'is_verified',
            'xp', 'teacher_level', 'learner_level', 'role',
            'availability', 'date_joined',
        ]
        read_only_fields = [
            'id', 'email', 'reputation_score', 'is_verified',
            'xp', 'teacher_level', 'learner_level', 'date_joined',
        ]


class PublicProfileSerializer(serializers.ModelSerializer):
    """What strangers can see."""
    availability = AvailabilitySlotSerializer(many=True, read_only=True)

    class Meta:
        model = User
        fields = [
            'id', 'username', 'bio', 'avatar', 'college',
            'reputation_score', 'xp', 'teacher_level', 'learner_level',
            'availability',
        ]
