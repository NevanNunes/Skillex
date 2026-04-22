# apps/sessions/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import SessionListView, BookSessionView, SessionActionView, StudyCircleViewSet

router = DefaultRouter()
router.register('circles', StudyCircleViewSet, basename='study-circles')

urlpatterns = [
    path('sessions/', SessionListView.as_view()),
    path('sessions/book/', BookSessionView.as_view()),
    path('sessions/', include(router.urls)),
    path('sessions/<uuid:pk>/<str:action>/', SessionActionView.as_view()),
]