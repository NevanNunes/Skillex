# apps/sessions/urls.py
from django.urls import path
from .views import SessionListView, BookSessionView, SessionActionView

urlpatterns = [
    path('sessions/', SessionListView.as_view()),
    path('sessions/book/', BookSessionView.as_view()),
    path('sessions/<uuid:pk>/<str:action>/', SessionActionView.as_view()),
]