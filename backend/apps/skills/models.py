# apps/skills/models.py
import uuid
from django.db import models
from apps.users.models import User

class SkillCategory(models.Model):
    name = models.CharField(max_length=100)
    slug = models.SlugField(unique=True)

    def __str__(self):
        return self.name

class Skill(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100, unique=True)
    slug = models.SlugField(unique=True)
    category = models.ForeignKey(SkillCategory, on_delete=models.PROTECT)

    def __str__(self):
        return self.name

LEVELS = [('beginner','Beginner'), ('intermediate','Intermediate'), ('expert','Expert')]

class UserSkillTeach(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='teaches')
    skill = models.ForeignKey(Skill, on_delete=models.CASCADE)
    proficiency_level = models.CharField(max_length=20, choices=LEVELS)
    description = models.TextField(blank=True)
    hourly_rate = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)

    class Meta:
        unique_together = ('user', 'skill')

class UserSkillLearn(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='wants_to_learn')
    skill = models.ForeignKey(Skill, on_delete=models.CASCADE)
    current_level = models.CharField(max_length=20, choices=LEVELS)

    class Meta:
        unique_together = ('user', 'skill')

class SkillEvidence(models.Model):
    """
    Evidence or portfolio items uploaded by a user to prove their skill.
    Uses Cloudinary storage via Django's DEFAULT_FILE_STORAGE.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user_skill = models.ForeignKey(UserSkillTeach, on_delete=models.CASCADE, related_name='evidence')
    title = models.CharField(max_length=100)
    file = models.FileField(upload_to='evidence/')
    uploaded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.title} for {self.user_skill.skill.name}"