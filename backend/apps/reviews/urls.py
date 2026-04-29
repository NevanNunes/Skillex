# apps/reviews/urls.py
from django.urls import path
from .views import CreateReviewView, UserReviewListView

urlpatterns = [
    path('reviews/', CreateReviewView.as_view()),
    path('reviews/user/<str:username>/', UserReviewListView.as_view()),
]