# apps/matching/admin.py
from django.contrib import admin
from .models import Match

@admin.register(Match)
class MatchAdmin(admin.ModelAdmin):
    list_display = ['learner', 'teacher', 'teach_skill', 'score', 'status', 'created_at']
    list_filter = ['status']
    search_fields = ['learner__username', 'teacher__username']
