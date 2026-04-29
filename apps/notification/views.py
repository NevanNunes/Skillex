# apps/notification/views.py
from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from django.utils import timezone

from .models import Notification
from .serializers import NotificationSerializer
from .services import get_unread_count


class NotificationListView(generics.ListAPIView):
    """
    GET /api/notifications/
    Paginated notification list (newest first).
    Query params:
      - read: 'true' | 'false' — filter by read status
    """
    serializer_class = NotificationSerializer

    def get_queryset(self):
        qs = Notification.objects.filter(user=self.request.user)
        read_filter = self.request.query_params.get('read')
        if read_filter == 'false':
            qs = qs.filter(is_read=False)
        elif read_filter == 'true':
            qs = qs.filter(is_read=True)
        return qs

    def list(self, request, *args, **kwargs):
        response = super().list(request, *args, **kwargs)
        response.data['unread_count'] = get_unread_count(request.user)
        return response


class MarkNotificationReadView(APIView):
    """PUT /api/notifications/<id>/read/ — mark a single notification as read."""
    def put(self, request, pk):
        try:
            notification = Notification.objects.get(pk=pk, user=request.user)
        except Notification.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

        if not notification.is_read:
            notification.is_read = True
            notification.read_at = timezone.now()
            notification.save(update_fields=['is_read', 'read_at'])

        return Response(status=status.HTTP_204_NO_CONTENT)


class MarkAllReadView(APIView):
    """PUT /api/notifications/read-all/ — mark all notifications as read."""
    def put(self, request):
        now = timezone.now()
        updated = Notification.objects.filter(
            user=request.user, is_read=False,
        ).update(is_read=True, read_at=now)

        return Response({'updated': updated})


class UnreadCountView(APIView):
    """GET /api/notifications/unread-count/ — quick unread count check."""
    def get(self, request):
        return Response({'unread_count': get_unread_count(request.user)})
