# apps/gamification/views.py
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import generics

from .models import XPTransaction, UserBadge
from .serializers import (
    XPTransactionSerializer, UserBadgeSerializer,
    GamificationSummarySerializer, LeaderboardEntrySerializer,
)
from .services import get_user_gamification_summary, get_leaderboard


class GamificationMeView(APIView):
    """GET /api/gamification/me — return XP, levels, badges for current user."""
    def get(self, request):
        summary = get_user_gamification_summary(request.user)
        return Response(summary)


class XPHistoryView(generics.ListAPIView):
    """GET /api/gamification/xp-history — paginated XP transaction log."""
    serializer_class = XPTransactionSerializer

    def get_queryset(self):
        return XPTransaction.objects.filter(user=self.request.user)


class MyBadgesView(generics.ListAPIView):
    """GET /api/gamification/badges — all badges earned by the current user."""
    serializer_class = UserBadgeSerializer

    def get_queryset(self):
        return UserBadge.objects.filter(user=self.request.user).select_related('badge')


class LeaderboardView(APIView):
    """
    GET /api/gamification/leaderboard
    Query params:
      - scope: 'campus' | 'global' (default 'global')
      - college: required if scope=campus
      - limit: max 50
    """
    def get(self, request):
        scope = request.query_params.get('scope', 'global')
        college = request.query_params.get('college')
        limit = min(int(request.query_params.get('limit', 50)), 50)

        entries = get_leaderboard(scope=scope, college=college, limit=limit)

        # Find current user's rank
        user_rank = None
        for entry in entries:
            if entry['user']['id'] == str(request.user.id):
                user_rank = entry['rank']
                break

        return Response({
            'leaderboard': entries,
            'current_user_rank': user_rank,
        })
