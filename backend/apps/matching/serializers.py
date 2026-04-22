# apps/matching/serializers.py
from rest_framework import serializers
from apps.users.serializers import PublicProfileSerializer
from apps.skills.serializers import UserSkillTeachSerializer
from .models import Match

class MatchSerializer(serializers.ModelSerializer):
    teacher = PublicProfileSerializer(read_only=True)
    teach_skill = UserSkillTeachSerializer(read_only=True)

    class Meta:
        model = Match
        fields = ['id', 'teacher', 'teach_skill', 'score', 'status', 'created_at']
        read_only_fields = fields