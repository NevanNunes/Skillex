# apps/gamification/serializers.py
from rest_framework import serializers
from .models import XPTransaction, Badge, UserBadge


class XPTransactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = XPTransaction
        fields = ['id', 'action', 'xp_amount', 'reference_id', 'created_at']
        read_only_fields = fields


class BadgeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Badge
        fields = ['id', 'name', 'description', 'icon', 'criteria_action', 'criteria_count']


class UserBadgeSerializer(serializers.ModelSerializer):
    badge = BadgeSerializer(read_only=True)

    class Meta:
        model = UserBadge
        fields = ['id', 'badge', 'awarded_at']


class GamificationSummarySerializer(serializers.Serializer):
    xp = serializers.IntegerField()
    teacher_level = serializers.IntegerField()
    learner_level = serializers.IntegerField()
    badges = serializers.ListField()


class LeaderboardEntrySerializer(serializers.Serializer):
    rank = serializers.IntegerField()
    user = serializers.DictField()
    xp = serializers.IntegerField()
    level = serializers.IntegerField()
