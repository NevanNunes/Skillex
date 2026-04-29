import os
import django
import random

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.users.models import User, AvailabilitySlot
from apps.skills.models import SkillCategory, Skill, UserSkillTeach, UserSkillLearn

def run_seed():
    print("Starting database seed...")

    # 1. Create Categories
    cats = {
        'programming': SkillCategory.objects.get_or_create(name='Programming', slug='programming')[0],
        'design': SkillCategory.objects.get_or_create(name='Design', slug='design')[0],
        'business': SkillCategory.objects.get_or_create(name='Business', slug='business')[0],
        'languages': SkillCategory.objects.get_or_create(name='Languages', slug='languages')[0],
    }

    # 2. Create Skills
    skills = {
        'python': Skill.objects.get_or_create(name='Python', slug='python', category=cats['programming'])[0],
        'react': Skill.objects.get_or_create(name='React', slug='react', category=cats['programming'])[0],
        'ui_ux': Skill.objects.get_or_create(name='UI/UX Design', slug='ui-ux', category=cats['design'])[0],
        'marketing': Skill.objects.get_or_create(name='Digital Marketing', slug='digital-marketing', category=cats['business'])[0],
        'spanish': Skill.objects.get_or_create(name='Spanish', slug='spanish', category=cats['languages'])[0],
        'data_science': Skill.objects.get_or_create(name='Data Science', slug='data-science', category=cats['programming'])[0],
    }

    # 3. Define 10 Users
    user_data = [
        {
            "first": "Alex", "last": "Rivera", "username": "arivera", "email": "alex@example.com",
            "college": "Tech University", "bio": "Full-stack developer who loves building interactive web apps. Always down to trade React tips for design advice!",
            "teach": [('react', 'expert'), ('python', 'intermediate')],
            "learn": [('ui_ux', 'beginner')],
        },
        {
            "first": "Sam", "last": "Chen", "username": "samchen", "email": "sam@example.com",
            "college": "Design Institute", "bio": "Visual designer focusing on user experience. I make things look good and feel intuitive.",
            "teach": [('ui_ux', 'expert')],
            "learn": [('react', 'beginner')],
        },
        {
            "first": "Jordan", "last": "Smith", "username": "jsmith", "email": "jordan@example.com",
            "college": "Business School", "bio": "Marketing major and startup enthusiast. Looking to learn technical skills to build my own MVPs.",
            "teach": [('marketing', 'expert')],
            "learn": [('python', 'beginner')],
        },
        {
            "first": "Elena", "last": "Gomez", "username": "egomez", "email": "elena@example.com",
            "college": "State University", "bio": "Native Spanish speaker and data science minor. Happy to do language exchange!",
            "teach": [('spanish', 'expert'), ('data_science', 'intermediate')],
            "learn": [('react', 'beginner')],
        },
        {
            "first": "David", "last": "Kim", "username": "dkim", "email": "david@example.com",
            "college": "Tech University", "bio": "Machine learning researcher. Python is my second language.",
            "teach": [('python', 'expert'), ('data_science', 'expert')],
            "learn": [('marketing', 'beginner')],
        },
        {
            "first": "Sarah", "last": "Jenkins", "username": "sjenkins", "email": "sarah@example.com",
            "college": "Design Institute", "bio": "Freelance digital marketer. I help brands grow their online presence.",
            "teach": [('marketing', 'expert')],
            "learn": [('spanish', 'beginner')],
        },
        {
            "first": "Marcus", "last": "Johnson", "username": "mjohnson", "email": "marcus@example.com",
            "college": "State University", "bio": "Self-taught programmer trying to break into the tech industry. React is my jam.",
            "teach": [('react', 'intermediate')],
            "learn": [('python', 'intermediate')],
        },
        {
            "first": "Nina", "last": "Patel", "username": "npatel", "email": "nina@example.com",
            "college": "Business School", "bio": "Data analyst working mostly with Python. Looking to improve my UX skills for better dashboards.",
            "teach": [('python', 'intermediate'), ('data_science', 'intermediate')],
            "learn": [('ui_ux', 'beginner')],
        },
        {
            "first": "Liam", "last": "O'Connor", "username": "loconnor", "email": "liam@example.com",
            "college": "Tech University", "bio": "Avid traveler and language nerd. Currently trying to master Spanish before my semester abroad.",
            "teach": [('react', 'intermediate')],
            "learn": [('spanish', 'intermediate')],
        },
        {
            "first": "Zoe", "last": "Wong", "username": "zwong", "email": "zoe@example.com",
            "college": "Design Institute", "bio": "Product designer. I want to understand how my designs are implemented in React.",
            "teach": [('ui_ux', 'expert')],
            "learn": [('react', 'beginner')],
        }
    ]

    for data in user_data:
        # Create User
        user, created = User.objects.get_or_create(
            email=data['email'],
            defaults={
                'username': data['username'],
                'first_name': data['first'],
                'last_name': data['last'],
                'bio': data['bio'],
                'college': data['college'],
                'reputation_score': round(random.uniform(3.5, 5.0), 1),
                'xp': random.randint(100, 1000)
            }
        )
        
        if created:
            user.set_password('SkillEX_2026!') # Strong, standard password for all test users
            user.save()
            print(f"[OK] Created user: {user.username}")
        else:
            print(f"[SKIP] User {user.username} already exists")

        # Clear existing skills and slots to avoid duplicates if run multiple times
        UserSkillTeach.objects.filter(user=user).delete()
        UserSkillLearn.objects.filter(user=user).delete()
        AvailabilitySlot.objects.filter(user=user).delete()

        # Add Teach Skills
        for skill_key, level in data['teach']:
            UserSkillTeach.objects.create(
                user=user,
                skill=skills[skill_key],
                proficiency_level=level,
                description=f"I have extensive experience with {skills[skill_key].name}."
            )

        # Add Learn Skills
        for skill_key, level in data['learn']:
            UserSkillLearn.objects.create(
                user=user,
                skill=skills[skill_key],
                current_level=level
            )

        # Add 3 random availability slots for matching algorithm to work
        days = random.sample(range(0, 7), 3) # Pick 3 random days (0=Mon, 6=Sun)
        for day in days:
            AvailabilitySlot.objects.create(
                user=user,
                day_of_week=day,
                start_time="10:00:00",
                end_time="12:00:00"
            )

    print("\nSeeding complete!")
    print("-" * 30)
    print("Test users ready. They all use the same password:")
    print("Password:  SkillEX_2026!")
    print("-" * 30)

if __name__ == "__main__":
    run_seed()
