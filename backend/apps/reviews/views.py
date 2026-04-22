# apps/reviews/views.py
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import generics, status
from django.shortcuts import get_object_or_404
from apps.users.models import User
from .models import Review
from .serializers import ReviewSerializer, CreateReviewSerializer
from .services import create_review

class CreateReviewView(APIView):
    def post(self, request):
        ser = CreateReviewSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        try:
            review = create_review(
                reviewer=request.user,
                session_id=ser.validated_data['session_id'],
                rating=ser.validated_data['rating'],
                comment=ser.validated_data.get('comment', ''),
            )
        except PermissionError as e:
            return Response({'detail': str(e)}, status=403)
        return Response(ReviewSerializer(review).data, status=201)

class UserReviewListView(generics.ListAPIView):
    serializer_class = ReviewSerializer

    def get_queryset(self):
        username = self.kwargs['username']
        user = get_object_or_404(User, username=username)
        return Review.objects.filter(reviewee=user).order_by('-created_at')