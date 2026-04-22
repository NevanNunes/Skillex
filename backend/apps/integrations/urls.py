# apps/integrations/urls.py
from django.urls import path
from .views import (
    GoogleCalendarConnectView, GoogleCalendarCallbackView,
    GoogleCalendarStatusView, GoogleCalendarSyncView,
    CreateVideoRoomView, GetVideoTokenView,
)

urlpatterns = [
    # Google Calendar OAuth2
    path('integrations/google/connect/', GoogleCalendarConnectView.as_view()),
    path('integrations/google/callback/', GoogleCalendarCallbackView.as_view()),
    path('integrations/google/status/', GoogleCalendarStatusView.as_view()),
    path('integrations/google/sync/<uuid:session_id>/', GoogleCalendarSyncView.as_view()),

    # Daily.co WebRTC
    path('integrations/daily/room/<uuid:session_id>/', CreateVideoRoomView.as_view()),
    path('integrations/daily/token/<uuid:session_id>/', GetVideoTokenView.as_view()),
]
