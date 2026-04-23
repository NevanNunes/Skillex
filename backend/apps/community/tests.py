# apps/community/tests.py
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from apps.users.models import User
from .models import Community, CommunityMembership, Post, Comment, Vote
from .services import (
    create_community, join_community, leave_community,
    create_post, create_comment, accept_answer, toggle_vote,
)


class CommunityServiceTests(TestCase):
    """Test community business logic."""

    def setUp(self):
        self.user = User.objects.create_user(email='u@ex.com', username='u', password='Pass1234!')
        self.user2 = User.objects.create_user(email='u2@ex.com', username='u2', password='Pass1234!')

    def test_create_community(self):
        c = create_community(self.user, 'Python Club', 'python-club', 'A club for Python lovers')
        self.assertEqual(c.member_count, 1)
        self.assertTrue(CommunityMembership.objects.filter(community=c, user=self.user, role='admin').exists())

    def test_join_community(self):
        c = create_community(self.user, 'JS Club', 'js-club')
        membership, created = join_community(c, self.user2)
        self.assertTrue(created)
        c.refresh_from_db()
        self.assertEqual(c.member_count, 2)

    def test_join_twice(self):
        c = create_community(self.user, 'Go Club', 'go-club')
        join_community(c, self.user2)
        membership, created = join_community(c, self.user2)
        self.assertFalse(created)

    def test_leave_community(self):
        c = create_community(self.user, 'Rust Club', 'rust-club')
        join_community(c, self.user2)
        left = leave_community(c, self.user2)
        self.assertTrue(left)
        c.refresh_from_db()
        self.assertEqual(c.member_count, 1)


class PostAndCommentServiceTests(TestCase):
    """Test post creation, comments, and accepted answers."""

    def setUp(self):
        self.author = User.objects.create_user(email='a@ex.com', username='a', password='Pass1234!')
        self.commenter = User.objects.create_user(email='c@ex.com', username='c', password='Pass1234!')
        self.other = User.objects.create_user(email='o@ex.com', username='o', password='Pass1234!')
        self.community = create_community(self.author, 'Test', 'test')

    def test_create_post(self):
        p = create_post(self.community, self.author, 'Hello', 'World', 'discussion')
        self.assertEqual(p.title, 'Hello')
        self.assertEqual(p.community, self.community)

    def test_create_comment(self):
        p = create_post(self.community, self.author, 'Q', 'How?', 'question')
        c = create_comment(p, self.commenter, 'Like this!')
        self.assertEqual(c.post, p)
        self.assertEqual(c.author, self.commenter)

    def test_threaded_comments(self):
        p = create_post(self.community, self.author, 'Q', 'How?')
        c1 = create_comment(p, self.commenter, 'Like this!')
        c2 = create_comment(p, self.author, 'Thanks!', parent_comment=c1)
        self.assertEqual(c2.parent_comment, c1)

    def test_accept_answer_by_author(self):
        p = create_post(self.community, self.author, 'Q', 'How?', 'question')
        c = create_comment(p, self.commenter, 'Answer')
        result = accept_answer(p, c, self.author)
        self.assertEqual(result.accepted_comment, c)

    def test_accept_answer_by_non_author_raises(self):
        p = create_post(self.community, self.author, 'Q', 'How?', 'question')
        c = create_comment(p, self.commenter, 'Answer')
        with self.assertRaises(PermissionError):
            accept_answer(p, c, self.other)


class VotingTests(TestCase):
    """Test voting mechanics including self-vote prevention and XP deduction."""

    def setUp(self):
        self.author = User.objects.create_user(email='a@ex.com', username='author', password='Pass1234!')
        self.voter = User.objects.create_user(email='v@ex.com', username='voter', password='Pass1234!')
        self.community = create_community(self.author, 'Vote Test', 'vote-test')
        self.post = create_post(self.community, self.author, 'Post', 'Body')

    def test_upvote_post(self):
        action, vote = toggle_vote(self.voter, 'post', self.post, 'upvote')
        self.assertEqual(action, 'created')
        self.post.refresh_from_db()
        self.assertEqual(self.post.upvotes, 1)

    def test_remove_upvote(self):
        toggle_vote(self.voter, 'post', self.post, 'upvote')
        action, _ = toggle_vote(self.voter, 'post', self.post, 'upvote')
        self.assertEqual(action, 'removed')
        self.post.refresh_from_db()
        self.assertEqual(self.post.upvotes, 0)

    def test_switch_vote(self):
        toggle_vote(self.voter, 'post', self.post, 'upvote')
        action, _ = toggle_vote(self.voter, 'post', self.post, 'downvote')
        self.assertEqual(action, 'switched')
        self.post.refresh_from_db()
        self.assertEqual(self.post.upvotes, 0)
        self.assertEqual(self.post.downvotes, 1)

    def test_self_vote_prevented(self):
        """Fix #4: Users should not be able to vote on their own posts."""
        with self.assertRaises(ValueError):
            toggle_vote(self.author, 'post', self.post, 'upvote')

    def test_xp_deducted_on_unvote(self):
        """Fix #1: XP should be reversed when an upvote is removed."""
        from apps.gamification.models import XPTransaction
        toggle_vote(self.voter, 'post', self.post, 'upvote')
        xp_after_vote = XPTransaction.objects.filter(user=self.author).count()
        self.assertGreater(xp_after_vote, 0)

        toggle_vote(self.voter, 'post', self.post, 'upvote')  # un-vote
        reversed_txs = XPTransaction.objects.filter(
            user=self.author, action='post_upvoted_reversed'
        ).count()
        self.assertGreater(reversed_txs, 0)

    def test_xp_not_farmed_by_toggle(self):
        """Upvoting and un-voting repeatedly should not accumulate net XP beyond the initial post_created award."""
        # The author already has some XP from creating the post (post_created = 10 XP)
        self.author.refresh_from_db()
        baseline_xp = self.author.xp

        for _ in range(5):
            toggle_vote(self.voter, 'post', self.post, 'upvote')  # vote
            toggle_vote(self.voter, 'post', self.post, 'upvote')  # un-vote
        self.author.refresh_from_db()
        self.assertEqual(self.author.xp, baseline_xp)  # XP unchanged from baseline


class CommunityAPITests(TestCase):
    """Test community API endpoints."""

    def setUp(self):
        self.user = User.objects.create_user(email='api@ex.com', username='apiuser', password='Pass1234!')
        self.user2 = User.objects.create_user(email='api2@ex.com', username='apiuser2', password='Pass1234!')
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def test_create_community_api(self):
        res = self.client.post('/api/communities/', {
            'name': 'API Club', 'slug': 'api-club', 'description': 'Test',
        })
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)

    def test_join_community_api(self):
        c = create_community(self.user, 'Join Test', 'join-test')
        client2 = APIClient()
        client2.force_authenticate(user=self.user2)
        res = client2.post(f'/api/communities/{c.id}/join/')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)

    def test_leave_community_api(self):
        c = create_community(self.user, 'Leave Test', 'leave-test')
        join_community(c, self.user2)
        client2 = APIClient()
        client2.force_authenticate(user=self.user2)
        res = client2.delete(f'/api/communities/{c.id}/leave/')
        self.assertEqual(res.status_code, status.HTTP_204_NO_CONTENT)

    def test_create_post_api(self):
        c = create_community(self.user, 'Post Test', 'post-test')
        res = self.client.post(f'/api/communities/{c.id}/posts/create/', {
            'title': 'First Post', 'body': 'Hello world!',
        })
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)

    def test_self_vote_api_returns_400(self):
        """Fix #4: API should return 400 when self-voting."""
        c = create_community(self.user, 'Self Vote', 'self-vote')
        p = create_post(c, self.user, 'My Post', 'Body')
        res = self.client.post(f'/api/posts/{p.id}/vote/', {'vote_type': 'upvote'})
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_accept_answer_api(self):
        c = create_community(self.user, 'Accept', 'accept')
        p = create_post(c, self.user, 'Question', 'How?', 'question')
        comment = create_comment(p, self.user2, 'Answer!')
        res = self.client.put(f'/api/posts/{p.id}/accept/{comment.id}/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)

    def test_accept_answer_by_non_author_api(self):
        c = create_community(self.user, 'Reject', 'reject')
        p = create_post(c, self.user, 'Question', 'How?', 'question')
        comment = create_comment(p, self.user2, 'Answer!')
        client2 = APIClient()
        client2.force_authenticate(user=self.user2)
        res = client2.put(f'/api/posts/{p.id}/accept/{comment.id}/')
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)
