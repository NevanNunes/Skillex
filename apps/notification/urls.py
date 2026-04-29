# apps/notification/urls.py
from django.urls import path
from .views import (
    NotificationListView, MarkNotificationReadView,
    MarkAllReadView, UnreadCountView,
)

urlpatterns = [
    path('notifications/', NotificationListView.as_view()),
    path('notifications/<uuid:pk>/read/', MarkNotificationReadView.as_view()),
    path('notifications/read-all/', MarkAllReadView.as_view()),
    path('notifications/unread-count/', UnreadCountView.as_view()),
]
