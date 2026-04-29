# apps/reviews/admin.py
from django.contrib import admin
from .models import Review

@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    list_display = ['reviewer', 'reviewee', 'rating', 'session', 'created_at']
    list_filter = ['rating']
    search_fields = ['reviewer__username', 'reviewee__username']
