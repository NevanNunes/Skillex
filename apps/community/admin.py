# apps/community/admin.py
from django.contrib import admin
from .models import Community, CommunityMembership, Post, Comment, Vote


@admin.register(Community)
class CommunityAdmin(admin.ModelAdmin):
    list_display = ['name', 'slug', 'member_count', 'created_by', 'created_at']
    search_fields = ['name', 'slug']
    list_filter = ['created_at']
    prepopulated_fields = {'slug': ('name',)}


@admin.register(CommunityMembership)
class CommunityMembershipAdmin(admin.ModelAdmin):
    list_display = ['user', 'community', 'role', 'joined_at']
    list_filter = ['role']


@admin.register(Post)
class PostAdmin(admin.ModelAdmin):
    list_display = ['title', 'community', 'author', 'post_type', 'upvotes', 'created_at']
    list_filter = ['post_type', 'is_pinned', 'created_at']
    search_fields = ['title', 'body']


@admin.register(Comment)
class CommentAdmin(admin.ModelAdmin):
    list_display = ['__str__', 'upvotes', 'created_at']
    list_filter = ['created_at']


@admin.register(Vote)
class VoteAdmin(admin.ModelAdmin):
    list_display = ['user', 'vote_type', 'target_type', 'created_at']
    list_filter = ['vote_type', 'target_type']
