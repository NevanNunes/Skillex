# apps/chat/serializers.py
from rest_framework import serializers
from .models import ChatRoom, Message
from apps.users.models import User

class MessageSerializer(serializers.ModelSerializer):
    sender_username = serializers.CharField(source='sender.username', read_only=True)

    class Meta:
        model = Message
        fields = ['id', 'sender', 'sender_username', 'content', 'is_read', 'created_at']
        read_only_fields = ['id', 'sender', 'sender_username', 'is_read', 'created_at']


class ChatParticipantSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'avatar']

class ChatRoomSerializer(serializers.ModelSerializer):
    last_message = serializers.SerializerMethodField()
    unread_count = serializers.SerializerMethodField()
    participant = serializers.SerializerMethodField()

    class Meta:
        model = ChatRoom
        fields = ['id', 'teacher', 'learner', 'participant', 'last_message', 'unread_count', 'created_at']

    def get_last_message(self, obj):
        msg = obj.messages.last()
        return MessageSerializer(msg).data if msg else None

    def get_unread_count(self, obj):
        user = self.context['request'].user
        return obj.messages.filter(is_read=False).exclude(sender=user).count()

    def get_participant(self, obj):
        user = self.context['request'].user
        if obj.teacher_id == user.id:
            return ChatParticipantSerializer(obj.learner).data
        return ChatParticipantSerializer(obj.teacher).data