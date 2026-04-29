# apps/gamification/admin.py
from django.contrib import admin
from .models import XPTransaction, Badge, UserBadge


@admin.register(XPTransaction)
class XPTransactionAdmin(admin.ModelAdmin):
    list_display = ['user', 'action', 'xp_amount', 'created_at']
    list_filter = ['action', 'created_at']
    search_fields = ['user__username', 'user__email']
    readonly_fields = ['id', 'user', 'action', 'xp_amount', 'reference_id', 'created_at']


@admin.register(Badge)
class BadgeAdmin(admin.ModelAdmin):
    list_display = ['name', 'icon', 'criteria_action', 'criteria_count']
    search_fields = ['name']


@admin.register(UserBadge)
class UserBadgeAdmin(admin.ModelAdmin):
    list_display = ['user', 'badge', 'awarded_at']
    list_filter = ['badge']
    search_fields = ['user__username']
