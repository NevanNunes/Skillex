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

class LearnSkillViewSet(viewsets.ModelViewSet):
    serializer_class = UserSkillLearnSerializer

    def get_queryset(self):
        return UserSkillLearn.objects.filter(
            user=self.request.user
        ).select_related('skill', 'skill__category')

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)