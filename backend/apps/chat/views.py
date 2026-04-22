# apps/chat/views.py
from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404
from .models import ChatRoom, Message
from .serializers import ChatRoomSerializer, MessageSerializer

class ChatRoomListView(generics.ListAPIView):
    serializer_class = ChatRoomSerializer

    def get_queryset(self):
        user = self.request.user
        return ChatRoom.objects.filter(
            match__teacher=user
        ) | ChatRoom.objects.filter(match__learner=user)

class MessageListView(generics.ListAPIView):
    serializer_class = MessageSerializer

    def get_queryset(self):
        room = self._get_room()
        return room.messages.select_related('sender')

    def _get_room(self):
        user = self.request.user
        return get_object_or_404(
            ChatRoom,
            id=self.kwargs['room_id'],
            match__in=user.matches_as_teacher.all() | user.matches_as_learner.all()
        )

class MarkMessagesReadView(APIView):
    """POST /api/chat/rooms/<room_id>/read/ — mark incoming messages as read."""
    def post(self, request, room_id):
        user = request.user
        room = get_object_or_404(
            ChatRoom,
            id=room_id,
            match__in=user.matches_as_teacher.all() | user.matches_as_learner.all()
        )
        updated = room.messages.exclude(sender=user).filter(is_read=False).update(is_read=True)
        return Response({'marked_read': updated})

class SendMessageView(generics.CreateAPIView):
    serializer_class = MessageSerializer

    def perform_create(self, serializer):
        room = get_object_or_404(ChatRoom, id=self.kwargs['room_id'])
        serializer.save(sender=self.request.user, room=room)