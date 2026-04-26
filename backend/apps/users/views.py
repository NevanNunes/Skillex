# apps/users/views.py
from rest_framework import generics, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.db import transaction

from .models import User, AvailabilitySlot
from .serializers import (
    RegisterSerializer, UserProfileSerializer, PublicProfileSerializer,
    AvailabilitySlotSerializer, AvailabilityBulkSerializer,
)
from .slot_overlap import get_overlapping_slots


class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]


class MeView(generics.RetrieveUpdateAPIView):
    serializer_class = UserProfileSerializer

    def get_object(self):
        return self.request.user


class PublicProfileView(generics.RetrieveAPIView):
    serializer_class = PublicProfileSerializer
    queryset = User.objects.all()
    lookup_field = 'username'
    permission_classes = [permissions.AllowAny]


class UserSearchView(generics.ListAPIView):
    serializer_class = PublicProfileSerializer
    permission_classes = [permissions.IsAuthenticated]
    search_fields = ['username', 'first_name', 'last_name', 'college', 'branch', 'bio']
    ordering_fields = ['username', 'college', 'date_joined']
    ordering = ['username']

    def get_queryset(self):
        return User.objects.exclude(pk=self.request.user.pk)


class AvailabilityView(APIView):
    """
    GET  /api/users/me/availability/  — list current user's availability slots.
    PUT  /api/users/me/availability/  — replace entire availability array.
    """
    def get(self, request):
        slots = AvailabilitySlot.objects.filter(user=request.user)
        return Response(AvailabilitySlotSerializer(slots, many=True).data)

    def put(self, request):
        ser = AvailabilityBulkSerializer(data=request.data)
        ser.is_valid(raise_exception=True)

        with transaction.atomic():
            # Delete all existing slots and recreate
            AvailabilitySlot.objects.filter(user=request.user).delete()
            new_slots = []
            for slot_data in ser.validated_data['slots']:
                new_slots.append(AvailabilitySlot(
                    user=request.user,
                    day_of_week=slot_data['day_of_week'],
                    start_time=slot_data['start_time'],
                    end_time=slot_data['end_time'],
                    mode=slot_data.get('mode', 'online'),
                ))
            AvailabilitySlot.objects.bulk_create(new_slots)

        created = AvailabilitySlot.objects.filter(user=request.user)
        return Response(
            AvailabilitySlotSerializer(created, many=True).data,
            status=status.HTTP_200_OK,
        )


class OverlapView(APIView):
    """
    GET /api/calendar/overlap/<user_id>/
    Compute overlapping availability windows between the current user
    and the target user for the next 14 days, excluding confirmed sessions.
    """
    def get(self, request, user_id):
        target_user = get_object_or_404(User, pk=user_id)

        # Prefetch availability
        current_user = User.objects.prefetch_related('availability').get(pk=request.user.pk)
        target_user = User.objects.prefetch_related('availability').get(pk=target_user.pk)

        # Get confirmed sessions involving either user
        from apps.sessions.models import Session
        confirmed = Session.objects.filter(
            status='confirmed',
        ).filter(
            # sessions involving either user
            teacher__in=[current_user, target_user],
        ) | Session.objects.filter(
            status='confirmed',
            learner__in=[current_user, target_user],
        )

        days = int(request.query_params.get('days', 14))
        days = min(days, 30)  # Cap at 30 days

        windows = get_overlapping_slots(
            user_a=current_user,
            user_b=target_user,
            confirmed_sessions=list(confirmed),
            days_ahead=days,
        )

        return Response({
            'user_a': str(current_user.id),
            'user_b': str(target_user.id),
            'days_ahead': days,
            'overlap_count': len(windows),
            'windows': windows,
        })