# apps/community/urls.py
from django.urls import path
from .views import (
    CommunityListCreateView, CommunityDetailView,
    CommunityJoinView, CommunityLeaveView,
    CommunityPostListView, CreatePostView,
    PostDetailView, PostVoteView, AcceptAnswerView,
    PostCommentListView, CreateCommentView, CommentVoteView,
)

urlpatterns = [
    # Communities
    path('communities/', CommunityListCreateView.as_view()),
    path('communities/<uuid:pk>/', CommunityDetailView.as_view()),
    path('communities/<uuid:pk>/join/', CommunityJoinView.as_view()),
    path('communities/<uuid:pk>/leave/', CommunityLeaveView.as_view()),

    # Posts within a community
    path('communities/<uuid:pk>/posts/', CommunityPostListView.as_view()),
    path('communities/<uuid:pk>/posts/create/', CreatePostView.as_view()),

    # Single post operations
    path('posts/<uuid:pk>/', PostDetailView.as_view()),
    path('posts/<uuid:pk>/vote/', PostVoteView.as_view()),
    path('posts/<uuid:pk>/accept/<uuid:comment_id>/', AcceptAnswerView.as_view()),

    # Comments on a post
    path('posts/<uuid:pk>/comments/', PostCommentListView.as_view()),
    path('posts/<uuid:pk>/comments/create/', CreateCommentView.as_view()),
    path('posts/<uuid:pk>/comments/<uuid:comment_id>/vote/', CommentVoteView.as_view()),
]
