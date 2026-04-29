# apps/skills/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import SkillListView, TeachSkillViewSet, LearnSkillViewSet

router = DefaultRouter()
router.register('skills/teach', TeachSkillViewSet, basename='teach-skill')
router.register('skills/learn', LearnSkillViewSet, basename='learn-skill')

urlpatterns = [
    path('skills/', SkillListView.as_view()),
    path('', include(router.urls)),
]