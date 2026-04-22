# apps/community/serializers.py
from rest_framework import serializers
from .models import Community, CommunityMembership, Post, Comment, Vote


# ──────────────────────────────────────────
# Community
# ──────────────────────────────────────────
class CommunitySerializer(serializers.ModelSerializer):
    post_count = serializers.SerializerMethodField()
    is_member = serializers.SerializerMethodField()

    class Meta:
        model = Community
        fields = [
            'id', 'name', 'slug', 'description', 'skill',
            'created_by', 'member_count', 'post_count',
            'is_member', 'created_at',
        ]
        read_only_fields = ['id', 'created_by', 'member_count', 'created_at']

    def get_post_count(self, obj):
        return obj.posts.count()

    def get_is_member(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.memberships.filter(user=request.user).exists()
        return False


class CreateCommunitySerializer(serializers.ModelSerializer):
    class Meta:
        model = Community
        fields = ['name', 'slug', 'description', 'skill']


# ──────────────────────────────────────────
# Post
# ──────────────────────────────────────────
class AuthorMiniSerializer(serializers.Serializer):
    """Lightweight author representation embedded inside posts/comments."""
    id = serializers.UUIDField()
    username = serializers.CharField()
    avatar = serializers.ImageField()


class CommentSerializer(serializers.ModelSerializer):
    author = AuthorMiniSerializer(read_only=True)
    net_votes = serializers.IntegerField(read_only=True)
    replies = serializers.SerializerMethodField()

    class Meta:
        model = Comment
        fields = [
            'id', 'post', 'author', 'body', 'parent_comment',
            'upvotes', 'downvotes', 'net_votes', 'replies',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'author', 'upvotes', 'downvotes', 'created_at', 'updated_at']

    def get_replies(self, obj):
        """Return up to 3 levels of nested replies."""
        depth = self.context.get('depth', 0)
        if depth >= 3:
            return []
        children = obj.replies.all()
        return CommentSerializer(
            children, many=True,
            context={**self.context, 'depth': depth + 1}
        ).data


class CreateCommentSerializer(serializers.Serializer):
    body = serializers.CharField(max_length=3000)
    parent_comment_id = serializers.UUIDField(required=False, allow_null=True)


class PostSerializer(serializers.ModelSerializer):
    author = AuthorMiniSerializer(read_only=True)
    comment_count = serializers.IntegerField(read_only=True)
    net_votes = serializers.IntegerField(read_only=True)
    user_vote = serializers.SerializerMethodField()

    class Meta:
        model = Post
        fields = [
            'id', 'community', 'author', 'title', 'body',
            'post_type', 'tags', 'upvotes', 'downvotes', 'net_votes',
            'comment_count', 'accepted_comment', 'is_pinned',
            'user_vote', 'created_at', 'updated_at',
        ]
        read_only_fields = [
            'id', 'author', 'upvotes', 'downvotes',
            'accepted_comment', 'is_pinned', 'created_at', 'updated_at',
        ]

    def get_user_vote(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            vote = Vote.objects.filter(
                user=request.user, target_type='post', post=obj
            ).first()
            return vote.vote_type if vote else None
        return None


class CreatePostSerializer(serializers.Serializer):
    title = serializers.CharField(max_length=200)
    body = serializers.CharField()
    post_type = serializers.ChoiceField(
        choices=['question', 'discussion', 'resource', 'poll'],
        default='discussion',
    )
    tags = serializers.ListField(
        child=serializers.CharField(max_length=50),
        required=False, max_length=10, default=list,
    )


# ──────────────────────────────────────────
# Vote
# ──────────────────────────────────────────
class VoteSerializer(serializers.Serializer):
    vote_type = serializers.ChoiceField(choices=['upvote', 'downvote'])
