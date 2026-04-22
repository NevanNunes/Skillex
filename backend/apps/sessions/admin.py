# apps/sessions/admin.py
from django.contrib import admin
from .models import Session

@admin.register(Session)
class SessionAdmin(admin.ModelAdmin):
    list_display = ['teacher', 'learner', 'scheduled_at', 'duration_minutes', 'status', 'created_at']
    list_filter = ['status']
    search_fields = ['teacher__username', 'learner__username']
