# apps/users/services.py
from django.db.models import Avg
from .models import User

def update_reputation(user: User) -> None:
    """Recompute reputation from all reviews received."""
    from apps.reviews.models import Review
    reviews = Review.objects.filter(reviewee=user)
    if reviews.exists():
        avg = reviews.aggregate(avg=Avg('rating'))['avg']
        user.reputation_score = round(avg, 2)
        user.save(update_fields=['reputation_score'])