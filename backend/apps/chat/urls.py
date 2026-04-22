# apps/chat/urls.py
from django.urls import path
from .views import ChatRoomListView, MessageListView, SendMessageView, MarkMessagesReadView

urlpatterns = [
    path('chat/rooms/', ChatRoomListView.as_view()),
    path('chat/rooms/<uuid:room_id>/messages/', MessageListView.as_view()),
    path('chat/rooms/<uuid:room_id>/send/', SendMessageView.as_view()),
    path('chat/rooms/<uuid:room_id>/read/', MarkMessagesReadView.as_view()),
]