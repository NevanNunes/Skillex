# apps/reviews/services.py
from .models import Review
from apps.sessions.models import Session
from apps.users.services import update_reputation

def create_review(reviewer, session_id: str, rating: int, comment: str = '') -> Review:
    session = Session.objects.get(id=session_id)

    if reviewer not in [session.teacher, session.learner]:
        raise PermissionError("You are not a participant in this session.")

    reviewee = session.teacher if reviewer == session.learner else session.learner

    review = Review.objects.create(
        session=session,
        reviewer=reviewer,
        reviewee=reviewee,
        rating=rating,
        comment=comment,
    )
    update_reputation(reviewee)  # recalculate their score
    return review