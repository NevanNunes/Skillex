# apps/matching/views.py
from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.db.models import Q
from .models import Match
from .serializers import MatchSerializer
from .services import refresh_matches_for_learner


def _canonical_user_pair(user_a, user_b):
    return tuple(sorted([user_a, user_b], key=lambda u: str(u.id)))

class MatchListView(generics.ListAPIView):
    serializer_class = MatchSerializer

    def get_queryset(self):
        return Match.objects.filter(
            Q(learner=self.request.user) | Q(teacher=self.request.user),
            status='pending',
        ).select_related(
            'teacher', 'learner', 'teach_skill', 'teach_skill__skill'
        ).order_by('-score')


class AcceptedMatchListView(generics.ListAPIView):
    serializer_class = MatchSerializer

    def get_queryset(self):
        return Match.objects.filter(
            Q(learner=self.request.user) | Q(teacher=self.request.user),
            status='accepted',
        ).select_related(
            'teacher', 'learner', 'teach_skill', 'teach_skill__skill'
        ).order_by('-created_at')

class MatchActionView(APIView):
    """POST /api/matches/{id}/accept/  or  /reject/"""

    def _get_match(self, pk, user):
        return Match.objects.get(
            Q(learner=user) | Q(teacher=user),
            id=pk,
            status='pending',
        )

    def post(self, request, pk, action):
        try:
            match = self._get_match(pk, request.user)
        except Match.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=404)

        if action == 'accept':
            if request.user == match.teacher:
                match.teacher_accepted = True
            elif request.user == match.learner:
                match.learner_accepted = True

            if match.teacher_accepted and match.learner_accepted:
                match.status = 'accepted'

            match.save(update_fields=['teacher_accepted', 'learner_accepted', 'status'])

            if match.status == 'accepted':
                # create chat room only after both users accept
                from apps.chat.models import ChatRoom
                teacher_user, learner_user = _canonical_user_pair(match.teacher, match.learner)
                ChatRoom.objects.get_or_create(
                    teacher=teacher_user,
                    learner=learner_user,
                )
            return Response(MatchSerializer(match, context={'request': request}).data)

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
