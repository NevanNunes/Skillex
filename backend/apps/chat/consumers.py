# apps/chat/consumers.py
"""
WebSocket consumers for real-time chat and presence.
Uses Django Channels (AsyncWebsocketConsumer).

Connection URL: ws://host/ws/chat/<room_id>/
Auth: JWT token passed as query param ?token=<jwt>
"""
import json
from datetime import datetime
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import AccessToken


User = get_user_model()


class ChatConsumer(AsyncWebsocketConsumer):
    """
    WebSocket consumer for real-time chat messages within a ChatRoom.
    Handles:
      - sending/receiving messages in real-time
      - typing indicators
      - read receipts
      - online presence tracking
    """

    async def connect(self):
        self.room_id = self.scope['url_route']['kwargs']['room_id']
        self.room_group_name = f'chat_{self.room_id}'

        # Authenticate via JWT query param
        self.user = await self._authenticate()
        if not self.user:
            await self.close(code=4001)
            return

        # Verify user is a participant
        is_participant = await self._verify_participant()
        if not is_participant:
            await self.close(code=4003)
            return

        # Join room group
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name,
        )

        # Track online presence
        await self.channel_layer.group_add(
            f'presence_{self.room_id}',
            self.channel_name,
        )

        await self.accept()

        # Broadcast user joined
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'user_presence',
                'user_id': str(self.user.id),
                'username': self.user.username,
                'status': 'online',
            }
        )

    async def disconnect(self, close_code):
        if hasattr(self, 'user') and self.user:
            # Broadcast user left
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'user_presence',
                    'user_id': str(self.user.id),
                    'username': self.user.username,
                    'status': 'offline',
                }
            )

        # Leave groups
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name,
        )
        await self.channel_layer.group_discard(
            f'presence_{self.room_id}',
            self.channel_name,
        )

    async def receive(self, text_data):
        """Handle incoming WebSocket messages."""
        data = json.loads(text_data)
        msg_type = data.get('type', 'chat_message')

        if msg_type == 'chat_message':
            await self._handle_chat_message(data)
        elif msg_type == 'typing':
            await self._handle_typing(data)
        elif msg_type == 'read_receipt':
            await self._handle_read_receipt(data)

    # ──────────────────────────────────────────
    # Message Handlers
    # ──────────────────────────────────────────
    async def _handle_chat_message(self, data):
        """Save message to DB and broadcast to room."""
        content = data.get('content', '').strip()
        if not content:
            return

        # Persist to database
        message = await self._save_message(content)

        # Broadcast to room
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'chat_message',
                'message': {
                    'id': str(message.id),
                    'sender': str(self.user.id),
                    'sender_username': self.user.username,
                    'content': content,
                    'is_read': False,
                    'created_at': message.created_at.isoformat(),
                },
            }
        )

    async def _handle_typing(self, data):
        """Broadcast typing indicator to room."""
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'typing_indicator',
                'user_id': str(self.user.id),
                'username': self.user.username,
                'is_typing': data.get('is_typing', True),
            }
        )

    async def _handle_read_receipt(self, data):
        """Mark messages as read and notify sender."""
        count = await self._mark_messages_read()
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'read_receipt',
                'user_id': str(self.user.id),
                'marked_read': count,
            }
        )

    # ──────────────────────────────────────────
    # Group message handlers (called by channel_layer)
    # ──────────────────────────────────────────
    async def chat_message(self, event):
        """Send chat message to WebSocket."""
        await self.send(text_data=json.dumps({
            'type': 'chat_message',
            'message': event['message'],
        }))

    async def typing_indicator(self, event):
        """Send typing indicator to WebSocket."""
        # Don't send typing indicator back to the typer
        if event['user_id'] != str(self.user.id):
            await self.send(text_data=json.dumps({
                'type': 'typing',
                'user_id': event['user_id'],
                'username': event['username'],
                'is_typing': event['is_typing'],
            }))

    async def read_receipt(self, event):
        """Send read receipt to WebSocket."""
        await self.send(text_data=json.dumps({
            'type': 'read_receipt',
            'user_id': event['user_id'],
            'marked_read': event['marked_read'],
        }))

    async def user_presence(self, event):
        """Send presence update to WebSocket."""
        await self.send(text_data=json.dumps({
            'type': 'presence',
            'user_id': event['user_id'],
            'username': event['username'],
            'status': event['status'],
        }))

    # ──────────────────────────────────────────
    # Database operations (sync → async wrappers)
    # ──────────────────────────────────────────
    @database_sync_to_async
    def _authenticate(self):
        """Authenticate user from JWT token in query string."""
        try:
            query_string = self.scope.get('query_string', b'').decode()
            params = dict(p.split('=') for p in query_string.split('&') if '=' in p)
            token = params.get('token', '')
            access_token = AccessToken(token)
            return User.objects.get(id=access_token['user_id'])
        except Exception:
            return None

    @database_sync_to_async
    def _verify_participant(self):
        """Check if the user is a participant in this chat room."""
        from .models import ChatRoom
        return ChatRoom.objects.filter(
            id=self.room_id,
        ).filter(
            models_Q_teacher_or_learner(self.user)
        ).exists()

    @database_sync_to_async
    def _save_message(self, content):
        """Persist a message to the database."""
        from .models import Message, ChatRoom
        from apps.notification.services import notify

        room = ChatRoom.objects.get(id=self.room_id)
        message = Message.objects.create(
            room=room,
            sender=self.user,
            content=content,
        )

        recipient = room.learner if room.teacher_id == self.user.id else room.teacher
        notify(
            user=recipient,
            notification_type='new_message',
            title=f'New message from {self.user.username}',
            message=content[:180],
            payload={'room_id': str(room.id), 'message_id': str(message.id)},
        )

        return message

    @database_sync_to_async
    def _mark_messages_read(self):
        """Mark all unread messages from the other user as read."""
        from .models import ChatRoom
        room = ChatRoom.objects.get(id=self.room_id)
        return room.messages.exclude(
            sender=self.user
        ).filter(is_read=False).update(is_read=True)


def models_Q_teacher_or_learner(user):
    """Helper: Q filter for rooms where user is teacher or learner."""
    from django.db.models import Q
    return Q(teacher=user) | Q(learner=user)
