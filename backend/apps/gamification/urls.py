# apps/gamification/urls.py
from django.urls import path
from .views import (
    GamificationMeView, XPHistoryView,
    MyBadgesView, LeaderboardView,
)

urlpatterns = [
    path('gamification/me/', GamificationMeView.as_view()),
    path('gamification/xp-history/', XPHistoryView.as_view()),
    path('gamification/badges/', MyBadgesView.as_view()),
    path('gamification/leaderboard/', LeaderboardView.as_view()),
]
