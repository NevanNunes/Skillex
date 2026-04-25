# apps/matching/serializers.py
from rest_framework import serializers
from apps.users.serializers import PublicProfileSerializer
from apps.skills.serializers import UserSkillTeachSerializer
from .models import Match

class MatchSerializer(serializers.ModelSerializer):
    teacher = PublicProfileSerializer(read_only=True)
    learner = PublicProfileSerializer(read_only=True)
    teach_skill = UserSkillTeachSerializer(read_only=True)
    counterpart = serializers.SerializerMethodField()
    accepted_by_me = serializers.SerializerMethodField()
    waiting_for_other = serializers.SerializerMethodField()

    class Meta:
        model = Match
        fields = [
            'id',
            'teacher',
            'learner',
            'teach_skill',
            'score',
            'status',
            'teacher_accepted',
            'learner_accepted',
            'counterpart',
            'accepted_by_me',
            'waiting_for_other',
            'created_at',
        ]
        read_only_fields = fields

    def get_counterpart(self, obj):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return None
        counterpart = obj.learner if obj.teacher_id == request.user.id else obj.teacher
        return PublicProfileSerializer(counterpart, context=self.context).data

    def get_accepted_by_me(self, obj):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return False
        if obj.teacher_id == request.user.id:
            return obj.teacher_accepted
        if obj.learner_id == request.user.id:
            return obj.learner_accepted
        return False

    def get_waiting_for_other(self, obj):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated or obj.status != 'pending':
            return False
        if obj.teacher_id == request.user.id:
            return obj.teacher_accepted and not obj.learner_accepted
        if obj.learner_id == request.user.id:
            return obj.learner_accepted and not obj.teacher_accepted
        return False