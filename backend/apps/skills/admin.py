# apps/skills/admin.py
from django.contrib import admin
from .models import SkillCategory, Skill, UserSkillTeach, UserSkillLearn

@admin.register(SkillCategory)
class SkillCategoryAdmin(admin.ModelAdmin):
    list_display = ['name', 'slug']
    prepopulated_fields = {'slug': ('name',)}

@admin.register(Skill)
class SkillAdmin(admin.ModelAdmin):
    list_display = ['name', 'slug', 'category']
    list_filter = ['category']
    prepopulated_fields = {'slug': ('name',)}
    search_fields = ['name']

@admin.register(UserSkillTeach)
class UserSkillTeachAdmin(admin.ModelAdmin):
    list_display = ['user', 'skill', 'proficiency_level', 'hourly_rate', 'is_active']
    list_filter = ['proficiency_level', 'is_active']

@admin.register(UserSkillLearn)
class UserSkillLearnAdmin(admin.ModelAdmin):
    list_display = ['user', 'skill', 'current_level']
    list_filter = ['current_level']
