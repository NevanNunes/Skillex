# apps/community/models.py
import uuid
from django.db import models
from apps.users.models import User
from apps.skills.models import Skill


class Community(models.Model):
    """Subject-based community / forum that groups related posts."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=150, unique=True)
    slug = models.SlugField(unique=True)
    description = models.TextField(blank=True, max_length=500)
    skill = models.ForeignKey(
        Skill, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='communities',
        help_text='Optional link to a specific skill this community covers.'
    )
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='created_communities')
    member_count = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name_plural = 'communities'
        ordering = ['-member_count']
        indexes = [
            models.Index(fields=['-member_count']),
        ]

    def __str__(self):
        return self.name


class CommunityMembership(models.Model):
    """Tracks which users belong to which communities."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    community = models.ForeignKey(Community, on_delete=models.CASCADE, related_name='memberships')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='community_memberships')
    role = models.CharField(
        max_length=20,
        choices=[('member', 'Member'), ('moderator', 'Moderator'), ('admin', 'Admin')],
        default='member'
    )
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('community', 'user')

    def __str__(self):
        return f'{self.user.username} in {self.community.name}'


class Post(models.Model):
    """A forum post within a community."""
    POST_TYPES = [
        ('question', 'Question'),
        ('discussion', 'Discussion'),
        ('resource', 'Resource'),
        ('poll', 'Poll'),
    ]
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    community = models.ForeignKey(Community, on_delete=models.CASCADE, related_name='posts')
    author = models.ForeignKey(User, on_delete=models.CASCADE, related_name='posts')
    title = models.CharField(max_length=200)
    body = models.TextField()
    post_type = models.CharField(max_length=20, choices=POST_TYPES, default='discussion')
    tags = models.JSONField(default=list, blank=True, help_text='List of string tags.')
    upvotes = models.IntegerField(default=0)
    downvotes = models.IntegerField(default=0)
    accepted_comment = models.ForeignKey(
        'Comment', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='accepted_for_post'
    )
    is_pinned = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-is_pinned', '-created_at']
        indexes = [
            models.Index(fields=['community', '-created_at']),
            models.Index(fields=['-upvotes']),
        ]

    def __str__(self):
        return self.title

    @property
    def comment_count(self):
        return self.comments.count()

    @property
    def net_votes(self):
        return self.upvotes - self.downvotes


class Comment(models.Model):
    """A threaded comment on a post (supports nesting via parent_comment)."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name='comments')
    author = models.ForeignKey(User, on_delete=models.CASCADE, related_name='comments')
    body = models.TextField(max_length=3000)
    parent_comment = models.ForeignKey(
        'self', on_delete=models.CASCADE, null=True, blank=True,
        related_name='replies'
    )
    upvotes = models.IntegerField(default=0)
    downvotes = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-upvotes', 'created_at']
        indexes = [
            models.Index(fields=['post', '-upvotes']),
        ]

    def __str__(self):
        return f'Comment by {self.author.username} on "{self.post.title}"'

    @property
    def net_votes(self):
        return self.upvotes - self.downvotes


class Vote(models.Model):
    """Tracks individual user votes on posts and comments to prevent duplicates."""
    VOTE_TYPES = [('upvote', 'Upvote'), ('downvote', 'Downvote')]
    TARGET_TYPES = [('post', 'Post'), ('comment', 'Comment')]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='votes')
    vote_type = models.CharField(max_length=10, choices=VOTE_TYPES)
    target_type = models.CharField(max_length=10, choices=TARGET_TYPES)
    post = models.ForeignKey(Post, on_delete=models.CASCADE, null=True, blank=True, related_name='vote_records')
    comment = models.ForeignKey(Comment, on_delete=models.CASCADE, null=True, blank=True, related_name='vote_records')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        # One vote per user per target
        constraints = [
            models.UniqueConstraint(
                fields=['user', 'post'],
                condition=models.Q(target_type='post'),
                name='unique_user_post_vote',
            ),
            models.UniqueConstraint(
                fields=['user', 'comment'],
                condition=models.Q(target_type='comment'),
                name='unique_user_comment_vote',
            ),
        ]
