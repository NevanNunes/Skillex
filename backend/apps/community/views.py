# apps/community/views.py
from rest_framework import generics, status, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.db.models import F

from .models import Community, Post, Comment
from .serializers import (
    CommunitySerializer, CreateCommunitySerializer,
    PostSerializer, CreatePostSerializer,
    CommentSerializer, CreateCommentSerializer,
    VoteSerializer,
)
from .services import (
    create_community, join_community, leave_community,
    create_post, create_comment, accept_answer, toggle_vote,
)


# ──────────────────────────────────────────
# Community views
# ──────────────────────────────────────────
class CommunityListCreateView(generics.ListCreateAPIView):
    """GET: list all communities sorted by member_count.  POST: create a new one."""
    queryset = Community.objects.all()

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return CreateCommunitySerializer
        return CommunitySerializer

    def perform_create(self, serializer):
        data = serializer.validated_data
        self.community = create_community(
            user=self.request.user,
            name=data['name'],
            slug=data['slug'],
            description=data.get('description', ''),
            skill=data.get('skill'),
        )

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        out = CommunitySerializer(self.community, context={'request': request})
        return Response(out.data, status=status.HTTP_201_CREATED)


class CommunityDetailView(generics.RetrieveAPIView):
    """GET a single community by id."""
    queryset = Community.objects.all()
    serializer_class = CommunitySerializer
    lookup_field = 'pk'


class CommunityJoinView(APIView):
    """POST: join a community."""
    def post(self, request, pk):
        community = get_object_or_404(Community, pk=pk)
        membership, created = join_community(community, request.user)
        if not created:
            return Response({'detail': 'Already a member.'}, status=status.HTTP_200_OK)
        return Response({'detail': 'Joined successfully.'}, status=status.HTTP_201_CREATED)


class CommunityLeaveView(APIView):
    """DELETE: leave a community."""
    def delete(self, request, pk):
        community = get_object_or_404(Community, pk=pk)
        left = leave_community(community, request.user)
        if not left:
            return Response({'detail': 'You are not a member.'}, status=status.HTTP_400_BAD_REQUEST)
        return Response(status=status.HTTP_204_NO_CONTENT)


# ──────────────────────────────────────────
# Post views
# ──────────────────────────────────────────
class CommunityPostListView(generics.ListAPIView):
    """GET: paginated posts for a community.  Supports ?sort=new|top|hot"""
    serializer_class = PostSerializer

    def get_queryset(self):
        community = get_object_or_404(Community, pk=self.kwargs['pk'])
        qs = Post.objects.filter(community=community)
        sort = self.request.query_params.get('sort', 'new')
        if sort == 'top':
            # Fix #2: Sort by net_votes (upvotes - downvotes) instead of just upvotes
            qs = qs.annotate(net=F('upvotes') - F('downvotes')).order_by('-net', '-created_at')
        elif sort == 'hot':
            qs = qs.annotate(net=F('upvotes') - F('downvotes')).order_by('-is_pinned', '-net', '-created_at')
        else:  # new
            qs = qs.order_by('-is_pinned', '-created_at')
        return qs


class CreatePostView(APIView):
    """POST: create a post in a community."""
    def post(self, request, pk):
        community = get_object_or_404(Community, pk=pk)
        ser = CreatePostSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        post = create_post(
            community=community,
            author=request.user,
            title=ser.validated_data['title'],
            body=ser.validated_data['body'],
            post_type=ser.validated_data.get('post_type', 'discussion'),
            tags=ser.validated_data.get('tags', []),
        )
        return Response(
            PostSerializer(post, context={'request': request}).data,
            status=status.HTTP_201_CREATED,
        )


class PostDetailView(generics.RetrieveAPIView):
    """GET: single post with details."""
    queryset = Post.objects.all()
    serializer_class = PostSerializer
    lookup_field = 'pk'


class PostVoteView(APIView):
    """POST: upvote or downvote a post. Toggle semantics."""
    def post(self, request, pk):
        post = get_object_or_404(Post, pk=pk)
        ser = VoteSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        try:
            action, _ = toggle_vote(
                user=request.user,
                target_type='post',
                target_obj=post,
                vote_type=ser.validated_data['vote_type'],
            )
        except ValueError as e:
            return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        post.refresh_from_db()
        return Response({
            'action': action,
            'upvotes': post.upvotes,
            'downvotes': post.downvotes,
        })


class AcceptAnswerView(APIView):
    """PUT: post author marks a comment as the accepted answer."""
    def put(self, request, pk, comment_id):
        post = get_object_or_404(Post, pk=pk)
        comment = get_object_or_404(Comment, pk=comment_id)
        try:
            post = accept_answer(post, comment, request.user)
        except PermissionError as e:
            return Response({'detail': str(e)}, status=status.HTTP_403_FORBIDDEN)
        except ValueError as e:
            return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(PostSerializer(post, context={'request': request}).data)


# ──────────────────────────────────────────
# Comment views
# ──────────────────────────────────────────
class PostCommentListView(generics.ListAPIView):
    """GET: threaded comments for a post (top-level, replies loaded via serializer)."""
    serializer_class = CommentSerializer

    def get_queryset(self):
        post = get_object_or_404(Post, pk=self.kwargs['pk'])
        return Comment.objects.filter(post=post, parent_comment__isnull=True)


class CreateCommentView(APIView):
    """POST: add a comment to a post."""
    def post(self, request, pk):
        post = get_object_or_404(Post, pk=pk)
        ser = CreateCommentSerializer(data=request.data)
        ser.is_valid(raise_exception=True)

        parent = None
        parent_id = ser.validated_data.get('parent_comment_id')
        if parent_id:
            parent = get_object_or_404(Comment, pk=parent_id, post=post)

        comment = create_comment(
            post=post,
            author=request.user,
            body=ser.validated_data['body'],
            parent_comment=parent,
        )
        return Response(
            CommentSerializer(comment, context={'request': request}).data,
            status=status.HTTP_201_CREATED,
        )


class CommentVoteView(APIView):
    """POST: upvote or downvote a comment."""
    def post(self, request, pk, comment_id):
        comment = get_object_or_404(Comment, pk=comment_id)
        ser = VoteSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        try:
            action, _ = toggle_vote(
                user=request.user,
                target_type='comment',
                target_obj=comment,
                vote_type=ser.validated_data['vote_type'],
            )
        except ValueError as e:
            return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        comment.refresh_from_db()
        return Response({
            'action': action,
            'upvotes': comment.upvotes,
            'downvotes': comment.downvotes,
        })
