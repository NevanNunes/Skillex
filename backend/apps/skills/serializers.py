# apps/skills/serializers.py
from rest_framework import serializers
from .models import Skill, SkillCategory, UserSkillTeach, UserSkillLearn

class SkillCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = SkillCategory
        fields = ['id', 'name', 'slug']

class SkillSerializer(serializers.ModelSerializer):
    category = SkillCategorySerializer(read_only=True)

    class Meta:
        model = Skill
        fields = ['id', 'name', 'slug', 'category']

class UserSkillTeachSerializer(serializers.ModelSerializer):
    skill = SkillSerializer(read_only=True)
    skill_id = serializers.UUIDField(write_only=True)

    class Meta:
        model = UserSkillTeach
        fields = ['id', 'skill', 'skill_id', 'proficiency_level',
                  'description', 'hourly_rate', 'is_active']
        read_only_fields = ['id']

class UserSkillLearnSerializer(serializers.ModelSerializer):
    skill = SkillSerializer(read_only=True)
    skill_id = serializers.UUIDField(write_only=True)

    class Meta:
        model = UserSkillLearn
        fields = ['id', 'skill', 'skill_id', 'current_level']
        read_only_fields = ['id']