# apps/integrations/ai_service.py
import logging
import google.generativeai as genai
from django.conf import settings

logger = logging.getLogger(__name__)

def get_gemini_client():
    if not settings.GEMINI_API_KEY:
        logger.warning('GEMINI_API_KEY is not set.')
        return None
    genai.configure(api_key=settings.GEMINI_API_KEY)
    return genai.GenerativeModel('gemini-1.5-flash')

def generate_lesson_plan(teacher_skill, learner_level, duration_minutes):
    """
    Generates a personalized lesson plan syllabus in Markdown format.
    """
    model = get_gemini_client()
    if not model:
        return "AI Lesson Planning is currently unavailable (API key missing)."
        
    prompt = f"""
    You are an expert educational curriculum designer.
    Design a {duration_minutes}-minute 1-on-1 class lesson plan for a student.
    
    Topic/Skill: {teacher_skill.skill.name} (Category: {teacher_skill.skill.category.name})
    Teacher's Proficiency: {teacher_skill.proficiency_level}
    Student's Current Level: {learner_level}
    
    Format the response in clean Markdown. Include:
    1. Class Objective (1 sentence)
    2. Prerequisites/Warmup (5 mins)
    3. Core Concepts Breakdown (with time allocations)
    4. Practical Exercise (hands-on)
    5. Q&A and Next Steps
    """
    try:
        response = model.generate_content(prompt)
        return response.text
    except Exception as e:
        logger.error(f"Gemini AI error generating lesson plan: {e}")
        return "Sorry, there was an error generating the lesson plan."

def summarize_session(session_notes, teacher_name, learner_name):
    """
    Summarizes the provided session notes and extracts Action Items.
    """
    model = get_gemini_client()
    if not model:
        return "AI Summarization is currently unavailable (API key missing)."
        
    prompt = f"""
    You are an AI teaching assistant. Review the following raw notes from a class session 
    between teacher '{teacher_name}' and student '{learner_name}'.
    
    Session Notes:
    \"\"\"{session_notes}\"\"\"
    
    Format the response in clean Markdown. Include:
    1. Brief Summary (2-3 sentences)
    2. Key Takeaways (Bullet points)
    3. Action Items / Homework for {learner_name}
    4. Suggestions for the next class
    """
    try:
        response = model.generate_content(prompt)
        return response.text
    except Exception as e:
        logger.error(f"Gemini AI error summarizing session: {e}")
        return "Sorry, there was an error summarizing the session."
