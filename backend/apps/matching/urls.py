# apps/matching/urls.py
from django.urls import path
from .views import (
    MatchListView, MatchActionView, RefreshMatchesView,
    SemanticMatchView, ProfileIndexView,
)

urlpatterns = [
    path('matches/', MatchListView.as_view()),
    path('matches/refresh/', RefreshMatchesView.as_view()),
    path('matches/semantic/', SemanticMatchView.as_view()),
    path('matches/index-profile/', ProfileIndexView.as_view()),
    path('matches/<uuid:pk>/<str:action>/', MatchActionView.as_view()),
]