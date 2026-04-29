# apps/users/admin.py
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User, AvailabilitySlot


class AvailabilitySlotInline(admin.TabularInline):
    model = AvailabilitySlot
    extra = 0


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ['email', 'username', 'college', 'xp', 'teacher_level',
                    'reputation_score', 'is_verified', 'date_joined']
    list_filter = ['is_verified', 'is_staff', 'role']
    search_fields = ['email', 'username', 'college']
    ordering = ['-date_joined']
    inlines = [AvailabilitySlotInline]


@admin.register(AvailabilitySlot)
class AvailabilitySlotAdmin(admin.ModelAdmin):
    list_display = ['user', 'day_of_week', 'start_time', 'end_time', 'mode']
    list_filter = ['day_of_week', 'mode']
    search_fields = ['user__username']
