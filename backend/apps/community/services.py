# apps/community/services.py
"""
Business logic for the Community module.
Keeps views thin and testable.
"""
from django.db import transaction
from django.db.models import F
from .models import Community, CommunityMembership, Post, Comment, Vote


# ──────────────────────────────────────────
# Community helpers
# ──────────────────────────────────────────
def create_community(user, name, slug, description='', skill=None):
    """Create a community and auto-add the creator as admin member."""
    with transaction.atomic():
        community = Community.objects.create(
            name=name,
            slug=slug,
            description=description,
            skill=skill,
            created_by=user,
            member_count=1,
        )
        CommunityMembership.objects.create(
            community=community,
            user=user,
            role='admin',
        )
    return community


def join_community(community, user):
    """Add a user to a community."""
    membership, created = CommunityMembership.objects.get_or_create(
        community=community, user=user,
        defaults={'role': 'member'},
    )
    if created:
        Community.objects.filter(pk=community.pk).update(member_count=F('member_count') + 1)
        community.refresh_from_db()
    return membership, created


def leave_community(community, user):
    """Remove a user from a community."""
    deleted, _ = CommunityMembership.objects.filter(community=community, user=user).delete()
    if deleted:
        Community.objects.filter(pk=community.pk).update(member_count=F('member_count') - 1)
        community.refresh_from_db()
    return deleted > 0


# ──────────────────────────────────────────
# Post helpers
# ──────────────────────────────────────────
def create_post(community, author, title, body, post_type='discussion', tags=None):
    """Create a new post in a community. Triggers XP award."""
    post = Post.objects.create(
        community=community,
        author=author,
        title=title,
        body=body,
        post_type=post_type,
        tags=tags or [],
    )
    # XP award — imported lazily to avoid circular imports
    try:
        from apps.gamification.services import award_xp
        award_xp(author, 'post_created')
    except ImportError:
        pass
    return post


# ──────────────────────────────────────────
# Comment helpers
# ──────────────────────────────────────────
def create_comment(post, author, body, parent_comment=None):
    """Create a comment (optionally threaded) on a post. Triggers XP award."""
    comment = Comment.objects.create(
        post=post,
        author=author,
        body=body,
        parent_comment=parent_comment,
    )
    try:
        from apps.gamification.services import award_xp
        award_xp(author, 'comment_created')
    except ImportError:
        pass
    return comment


def accept_answer(post, comment, user):
    """Mark a comment as the accepted answer. Only the post author may do this."""
    if post.author != user:
        raise PermissionError('Only the post author can accept an answer.')
    if comment.post != post:
        raise ValueError('Comment does not belong to this post.')
    post.accepted_comment = comment
    post.save(update_fields=['accepted_comment'])
    # Award XP to the comment author for accepted answer
    try:
        from apps.gamification.services import award_xp
        award_xp(comment.author, 'answer_accepted')
    except ImportError:
        pass
    return post


# ──────────────────────────────────────────
# Vote helpers
# ──────────────────────────────────────────
def toggle_vote(user, target_type, target_obj, vote_type):
    """
    Toggle a vote on a post or comment.
    - If the same vote_type already exists, remove it (un-vote).
    - If the opposite vote_type exists, switch it.
    - Otherwise, create a new vote.
    Returns (action, vote_or_none) where action is 'created', 'switched', or 'removed'.
    """
    lookup = {'user': user, 'target_type': target_type}
    if target_type == 'post':
        lookup['post'] = target_obj
    else:
        lookup['comment'] = target_obj

    with transaction.atomic():
        existing = Vote.objects.filter(**lookup).first()

        if existing:
            if existing.vote_type == vote_type:
                # Un-vote
                existing.delete()
                _update_vote_counts(target_obj, vote_type, delta=-1)
                return 'removed', None
            else:
                # Switch vote
                old_type = existing.vote_type
                existing.vote_type = vote_type
                existing.save(update_fields=['vote_type'])
                _update_vote_counts(target_obj, old_type, delta=-1)
                _update_vote_counts(target_obj, vote_type, delta=1)
                return 'switched', existing
        else:
            # New vote
            vote_data = {
                'user': user,
                'vote_type': vote_type,
                'target_type': target_type,
            }
            if target_type == 'post':
                vote_data['post'] = target_obj
            else:
                vote_data['comment'] = target_obj
            vote = Vote.objects.create(**vote_data)
            _update_vote_counts(target_obj, vote_type, delta=1)
            return 'created', vote


def _update_vote_counts(target_obj, vote_type, delta):
    """Atomically increment / decrement the vote counter on a post or comment."""
    field = 'upvotes' if vote_type == 'upvote' else 'downvotes'
    target_obj.__class__.objects.filter(pk=target_obj.pk).update(
        **{field: F(field) + delta}
    )
    target_obj.refresh_from_db()
    # XP for post/comment upvoted
    if vote_type == 'upvote' and delta > 0:
        try:
            from apps.gamification.services import award_xp
            if isinstance(target_obj, Post):
                award_xp(target_obj.author, 'post_upvoted')
            else:
                award_xp(target_obj.author, 'comment_upvoted')
        except ImportError:
            pass
