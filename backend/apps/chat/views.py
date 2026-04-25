# apps/chat/views.py
from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.exceptions import PermissionDenied
from django.shortcuts import get_object_or_404
from django.db.models import Q
from .models import ChatRoom, Message
from .serializers import ChatRoomSerializer, MessageSerializer
from apps.notification.services import notify

class ChatRoomListView(generics.ListAPIView):
    serializer_class = ChatRoomSerializer

    def get_queryset(self):
        user = self.request.user
        return ChatRoom.objects.filter(
            Q(teacher=user) | Q(learner=user)
        ).select_related(
            'teacher', 'learner'
        ).order_by('-created_at')

class MessageListView(generics.ListAPIView):
    serializer_class = MessageSerializer

    def get_queryset(self):
        room = self._get_room()
        return room.messages.select_related('sender')

    def _get_room(self):
        user = self.request.user
        return get_object_or_404(
            ChatRoom.objects.filter(Q(teacher=user) | Q(learner=user)),
            id=self.kwargs['room_id'],
        )

class MarkMessagesReadView(APIView):
    """POST /api/chat/rooms/<room_id>/read/ — mark incoming messages as read."""
    def post(self, request, room_id):
        user = request.user
        room = get_object_or_404(
            ChatRoom.objects.filter(Q(teacher=user) | Q(learner=user)),
            id=room_id,
        )
        updated = room.messages.exclude(sender=user).filter(is_read=False).update(is_read=True)
        return Response({'marked_read': updated})

class SendMessageView(generics.CreateAPIView):
    serializer_class = MessageSerializer

    def perform_create(self, serializer):
        user = self.request.user
        room = get_object_or_404(ChatRoom, id=self.kwargs['room_id'])
        if room.teacher_id != user.id and room.learner_id != user.id:
            raise PermissionDenied("User is not a participant in this room")
        message = serializer.save(sender=self.request.user, room=room)

        recipient = room.learner if room.teacher_id == user.id else room.teacher
        notify(
            user=recipient,
            notification_type='new_message',
            title=f'New message from {user.username}',
            message=message.content[:180],
            payload={'room_id': str(room.id), 'message_id': str(message.id)},
        )