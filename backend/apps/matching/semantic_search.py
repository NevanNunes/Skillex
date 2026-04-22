# apps/matching/semantic_search.py
"""
AI Semantic Matching Engine using Qdrant vector database
and OpenAI text-embedding-3-small for generating embeddings.

Architecture:
  1. Each user's skill profile is embedded into a 1536-dim vector.
  2. Vectors are stored in Qdrant with metadata (user_id, skills, levels).
  3. When matching, we embed the learner's desired skills and run ANN search.
  4. Results are re-ranked by combining semantic similarity with the
     existing rule-based score (reputation, completion rate).

This replaces simple SQL WHERE-based matching with semantic understanding:
  "I want to learn web development" → matches mentors who teach
  React, Next.js, Django, Flask, etc.
"""
import logging
import hashlib
from typing import Optional
from django.conf import settings

logger = logging.getLogger(__name__)

# ──────────────────────────────────────────
# Embedding Service
# ──────────────────────────────────────────
def generate_embedding(text: str) -> Optional[list]:
    """
    Generate a vector embedding for text using OpenAI's API.
    Falls back to a deterministic hash-based pseudo-embedding for dev.
    """
    if not settings.OPENAI_API_KEY:
        # Dev fallback: create a deterministic pseudo-embedding
        logger.info('OpenAI API key not set — using pseudo-embedding')
        return _pseudo_embedding(text)

    try:
        import openai
        client = openai.OpenAI(api_key=settings.OPENAI_API_KEY)
        response = client.embeddings.create(
            model=settings.EMBEDDING_MODEL,
            input=text,
        )
        return response.data[0].embedding
    except Exception as e:
        logger.error(f'Embedding generation failed: {e}')
        return _pseudo_embedding(text)


def _pseudo_embedding(text: str) -> list:
    """
    Create a deterministic pseudo-embedding from text (for development).
    Uses SHA-256 hash expanded to EMBEDDING_DIMENSION floats.
    Semantically similar texts will NOT produce similar vectors,
    but this allows testing the full pipeline without an API key.
    """
    dim = getattr(settings, 'EMBEDDING_DIMENSION', 1536)
    h = hashlib.sha256(text.lower().encode()).hexdigest()
    # Expand hash bytes to fill the dimension
    values = []
    for i in range(dim):
        byte_val = int(h[(i * 2) % len(h):(i * 2 + 2) % len(h) or None], 16)
        values.append((byte_val / 255.0) * 2 - 1)  # Normalize to [-1, 1]
    # Normalize to unit vector
    magnitude = sum(v ** 2 for v in values) ** 0.5
    if magnitude > 0:
        values = [v / magnitude for v in values]
    return values


def build_skill_profile_text(user) -> str:
    """
    Build a rich text representation of a user's teaching skills
    for embedding. Includes skill names, categories, levels, and bio.
    """
    parts = [f"Teacher: {user.username}"]

    if user.bio:
        parts.append(f"Bio: {user.bio}")

    for teach in user.teaches.select_related('skill', 'skill__category').filter(is_active=True):
        skill = teach.skill
        parts.append(
            f"Teaches {skill.name} ({skill.category.name}) "
            f"at {teach.proficiency_level} level"
        )
        if teach.description:
            parts.append(f"  Description: {teach.description}")

    return '. '.join(parts)


def build_learner_query_text(user) -> str:
    """Build a text query from what the user wants to learn."""
    parts = [f"Looking to learn:"]
    for learn in user.wants_to_learn.select_related('skill', 'skill__category'):
        skill = learn.skill
        parts.append(
            f"{skill.name} ({skill.category.name}), "
            f"current level: {learn.current_level}"
        )
    return ' '.join(parts)


# ──────────────────────────────────────────
# Qdrant Vector Store
# ──────────────────────────────────────────
def get_qdrant_client():
    """Get or create a Qdrant client instance."""
    try:
        from qdrant_client import QdrantClient
        return QdrantClient(
            host=settings.QDRANT_HOST,
            port=settings.QDRANT_PORT,
        )
    except ImportError:
        logger.warning('qdrant-client not installed — using in-memory fallback')
        return None
    except Exception as e:
        logger.error(f'Qdrant connection failed: {e}')
        return None


COLLECTION_NAME = 'skill_profiles'


def ensure_collection(client):
    """Create the Qdrant collection if it doesn't exist."""
    if client is None:
        return False

    try:
        from qdrant_client.models import Distance, VectorParams
        collections = [c.name for c in client.get_collections().collections]
        if COLLECTION_NAME not in collections:
            client.create_collection(
                collection_name=COLLECTION_NAME,
                vectors_config=VectorParams(
                    size=settings.EMBEDDING_DIMENSION,
                    distance=Distance.COSINE,
                ),
            )
            logger.info(f'Created Qdrant collection: {COLLECTION_NAME}')
        return True
    except Exception as e:
        logger.error(f'Collection creation failed: {e}')
        return False


def upsert_user_profile(user):
    """
    Embed a user's teaching profile and upsert it into Qdrant.
    Call this whenever a user updates their teaching skills.
    """
    client = get_qdrant_client()
    if not client:
        return False

    ensure_collection(client)

    text = build_skill_profile_text(user)
    embedding = generate_embedding(text)
    if not embedding:
        return False

    try:
        from qdrant_client.models import PointStruct

        # Use a stable integer ID from UUID (Qdrant needs int or str point IDs)
        point_id = str(user.id)

        # Build skill list for metadata
        skill_names = list(
            user.teaches.filter(is_active=True).values_list('skill__name', flat=True)
        )

        client.upsert(
            collection_name=COLLECTION_NAME,
            points=[
                PointStruct(
                    id=point_id,
                    vector=embedding,
                    payload={
                        'user_id': str(user.id),
                        'username': user.username,
                        'skills': skill_names,
                        'reputation': user.reputation_score,
                        'xp': user.xp,
                        'college': user.college,
                        'profile_text': text[:500],
                    },
                ),
            ],
        )
        logger.info(f'Upserted profile for {user.username} into Qdrant')
        return True
    except Exception as e:
        logger.error(f'Qdrant upsert failed: {e}')
        return False


def semantic_search_mentors(user, top_k=20, score_threshold=0.3):
    """
    Find semantically similar mentors for a learner.
    Combines vector similarity with rule-based scoring.

    Args:
        user: the learner User
        top_k: max results
        score_threshold: minimum cosine similarity

    Returns:
        List of dicts: [{user_id, username, similarity, skills, ...}]
    """
    client = get_qdrant_client()

    # Build query from learner's desired skills
    query_text = build_learner_query_text(user)
    query_embedding = generate_embedding(query_text)

    if not query_embedding:
        return []

    if client:
        try:
            ensure_collection(client)
            results = client.search(
                collection_name=COLLECTION_NAME,
                query_vector=query_embedding,
                limit=top_k,
                score_threshold=score_threshold,
                query_filter={
                    'must_not': [
                        {'key': 'user_id', 'match': {'value': str(user.id)}},
                    ],
                } if hasattr(client, 'search') else None,
            )

            return [
                {
                    'user_id': hit.payload['user_id'],
                    'username': hit.payload['username'],
                    'similarity_score': round(hit.score, 4),
                    'skills': hit.payload.get('skills', []),
                    'reputation': hit.payload.get('reputation', 0),
                    'xp': hit.payload.get('xp', 0),
                    'college': hit.payload.get('college', ''),
                }
                for hit in results
            ]
        except Exception as e:
            logger.error(f'Qdrant search failed: {e}')

    # Fallback: return empty (the existing rule-based matching still works)
    logger.warning('Semantic search unavailable — falling back to rule-based matching')
    return []


def refresh_all_profiles():
    """
    Rebuild the entire vector index.
    Run as a management command or Celery task.
    """
    from apps.users.models import User

    users_with_skills = User.objects.filter(teaches__is_active=True).distinct()
    count = 0
    for user in users_with_skills:
        if upsert_user_profile(user):
            count += 1

    logger.info(f'Refreshed {count} user profiles in Qdrant')
    return count
