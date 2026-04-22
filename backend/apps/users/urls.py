# apps/users/urls.py
from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView, TokenBlacklistView
from .views import RegisterView, MeView, PublicProfileView, AvailabilityView, OverlapView

urlpatterns = [
    path('auth/register/', RegisterView.as_view()),
    path('auth/login/', TokenObtainPairView.as_view()),
    path('auth/refresh/', TokenRefreshView.as_view()),
    path('auth/logout/', TokenBlacklistView.as_view()),
    path('users/me/', MeView.as_view()),
    path('users/me/availability/', AvailabilityView.as_view()),
    path('calendar/overlap/<uuid:user_id>/', OverlapView.as_view()),
    path('users/<str:username>/', PublicProfileView.as_view()),
]