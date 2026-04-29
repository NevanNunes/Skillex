# apps/skills/serializers.py
from rest_framework import serializers
from .models import Skill, SkillCategory, UserSkillTeach, UserSkillLearn, SkillEvidence

class SkillCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = SkillCategory
        fields = ['id', 'name', 'slug']

class SkillSerializer(serializers.ModelSerializer):
    category = SkillCategorySerializer(read_only=True)

    class Meta:
        model = Skill
        fields = ['id', 'name', 'slug', 'category']

class SkillEvidenceSerializer(serializers.ModelSerializer):
    class Meta:
        model = SkillEvidence
        fields = ['id', 'title', 'file', 'uploaded_at']
        read_only_fields = ['id', 'uploaded_at']

class UserSkillTeachSerializer(serializers.ModelSerializer):
    skill = SkillSerializer(read_only=True)
    skill_id = serializers.UUIDField(write_only=True)
    evidence = SkillEvidenceSerializer(many=True, read_only=True)

    class Meta:
        model = UserSkillTeach
        fields = ['id', 'skill', 'skill_id', 'proficiency_level',
                  'description', 'hourly_rate', 'is_active', 'evidence']
        read_only_fields = ['id', 'evidence']

class UserSkillLearnSerializer(serializers.ModelSerializer):
    skill = SkillSerializer(read_only=True)
    skill_id = serializers.UUIDField(write_only=True)

    class Meta:
        model = UserSkillLearn
        fields = ['id', 'skill', 'skill_id', 'current_level']
        read_only_fields = ['id']