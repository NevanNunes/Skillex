# apps/skills/views.py
from rest_framework import viewsets, generics, permissions
from django_filters.rest_framework import DjangoFilterBackend
from .models import Skill, UserSkillTeach, UserSkillLearn
from .serializers import SkillSerializer, UserSkillTeachSerializer, UserSkillLearnSerializer

class SkillListView(generics.ListAPIView):
    """Public skill directory with search."""
    queryset = Skill.objects.select_related('category').all()
    serializer_class = SkillSerializer
    permission_classes = [permissions.AllowAny]
    search_fields = ['name', 'category__name']

class TeachSkillViewSet(viewsets.ModelViewSet):
    serializer_class = UserSkillTeachSerializer

    def get_queryset(self):
        return UserSkillTeach.objects.filter(
            user=self.request.user
        ).select_related('skill', 'skill__category')

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    from rest_framework.decorators import action
    from rest_framework.response import Response
    from .models import SkillEvidence
    from .serializers import SkillEvidenceSerializer

    @action(detail=True, methods=['post'])
    def upload_evidence(self, request, pk=None):
        """Upload a file as evidence for this skill."""
        teach_skill = self.get_object()
        
        file = request.FILES.get('file')
        title = request.data.get('title', 'Portfolio Item')
        
        if not file:
            return Response({'detail': 'No file provided.'}, status=400)
            
        evidence = SkillEvidence.objects.create(
            user_skill=teach_skill,
            title=title,
            file=file
        )
        
        serializer = SkillEvidenceSerializer(evidence)
        return Response(serializer.data, status=201)

class LearnSkillViewSet(viewsets.ModelViewSet):
    serializer_class = UserSkillLearnSerializer

    def get_queryset(self):
        return UserSkillLearn.objects.filter(
            user=self.request.user
        ).select_related('skill', 'skill__category')

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)