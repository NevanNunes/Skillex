# apps/matching/views.py
from rest_framework import generics, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import Match
from .serializers import MatchSerializer
from .services import refresh_matches_for_learner

class MatchListView(generics.ListAPIView):
    serializer_class = MatchSerializer

    def get_queryset(self):
        return Match.objects.filter(
            learner=self.request.user,
            status='pending',
        ).select_related(
            'teacher', 'teach_skill', 'teach_skill__skill'
        ).order_by('-score')

class MatchActionView(APIView):
    """POST /api/matches/{id}/accept/  or  /reject/"""

    def _get_match(self, pk, user):
        return Match.objects.get(id=pk, learner=user, status='pending')

    def post(self, request, pk, action):
        try:
            match = self._get_match(pk, request.user)
        except Match.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=404)

        if action == 'accept':
            match.status = 'accepted'
            match.save()
            # create chat room when accepted
            from apps.chat.models import ChatRoom
            ChatRoom.objects.get_or_create(match=match)
            return Response(MatchSerializer(match).data)

        elif action == 'reject':
            match.status = 'rejected'
            match.save()
            return Response({'detail': 'Match rejected.'})

        return Response({'detail': 'Invalid action.'}, status=400)

class RefreshMatchesView(APIView):
    """POST /api/matches/refresh/ — recompute matches for the logged-in user."""
    def post(self, request):
        refresh_matches_for_learner(request.user)
        return Response({'detail': 'Matches refreshed.'})


class SemanticMatchView(APIView):
    """
    GET /api/matches/semantic/
    Use AI vector search to find semantically similar mentors.
    Falls back to rule-based matching if Qdrant/OpenAI are unavailable.

    Query params:
      - limit: max results (default 20)
      - threshold: minimum similarity (default 0.3)
    """
    def get(self, request):
        from .semantic_search import semantic_search_mentors

        limit = min(int(request.query_params.get('limit', 20)), 50)
        threshold = float(request.query_params.get('threshold', 0.3))

        results = semantic_search_mentors(
            user=request.user,
            top_k=limit,
            score_threshold=threshold,
        )

        return Response({
            'method': 'semantic' if results else 'rule_based',
            'count': len(results),
            'matches': results,
        })


class ProfileIndexView(APIView):
    """
    POST /api/matches/index-profile/
    Re-index the current user's teaching profile into Qdrant.
    Call this after updating skills.
    """
    def post(self, request):
        from .semantic_search import upsert_user_profile
        success = upsert_user_profile(request.user)
        if success:
            return Response({'detail': 'Profile indexed successfully.'})
        return Response(
            {'detail': 'Indexing failed — Qdrant may be unavailable.'},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )