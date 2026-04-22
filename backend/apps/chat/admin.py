# apps/chat/admin.py
from django.contrib import admin
from .models import ChatRoom, Message

@admin.register(ChatRoom)
class ChatRoomAdmin(admin.ModelAdmin):
    list_display = ['id', 'match', 'created_at']

@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = ['room', 'sender', 'content', 'is_read', 'created_at']
    list_filter = ['is_read']
