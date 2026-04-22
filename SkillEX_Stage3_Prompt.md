# SkillEX — Stage 3 Development Prompt
## AI & Scale: Intelligence Layer, Analytics & DevOps
**New:** Qdrant · LLM/RAG · Bull/Redis · Prometheus · GitHub Actions

---

## Context

You are a senior full-stack engineer and ML integration specialist continuing the SkillEX project. Stages 1 and 2 are fully working: auth, profiles, swipe matching, 1:1 chat, session booking, video calls, group sessions, community forum, Google Calendar sync, push notifications, RBAC, and gamification. Stage 3 adds the AI intelligence layer (embedding-based semantic matching, LLM session planner, community auto-tagging, duplicate detection, thread summarisation, content moderation agent), a campus analytics dashboard, and production-grade DevOps (Docker Compose, Redis/Bull job queue, Prometheus, Grafana, GitHub Actions CI/CD).

---

## Prerequisites & Architecture Context

Read the following before writing any new code:

- `server/services/matchingService.js` — existing filter-based matching logic to extend with hybrid scoring
- `server/services/xpService.js` — existing XP logic (new AI triggers will be added)
- `server/routes/matches.js` — existing `/api/matches/suggestions` route to add the `/semantic` and `/hybrid` variants
- `client/src/pages/Community.tsx` — existing community feed to add AI feature buttons
- `client/src/pages/Sessions.tsx` — existing session detail page to add the **Prepare Session** button

---

## New Infrastructure

### Docker Compose

Create `docker-compose.yml` in the project root defining all 6 services:

```yaml
services:
  api:
    build: ./server
    ports: ["5000:5000"]
    env_file: ./server/.env
    depends_on: [mongo, redis, qdrant]

  worker:
    build: ./server
    command: node workers/index.js
    env_file: ./server/.env
    depends_on: [mongo, redis, qdrant]

  client:
    build: ./client
    ports: ["5173:80"]

  mongo:
    image: mongo:7
    volumes: ["mongo_data:/data/db"]

  redis:
    image: redis:7-alpine
    volumes: ["redis_data:/data"]

  qdrant:
    image: qdrant/qdrant:v1.9.0
    ports: ["6333:6333"]
    volumes: ["qdrant_data:/qdrant/storage"]

volumes:
  mongo_data:
  redis_data:
  qdrant_data:
```

### New Dependencies

```bash
# Server
npm install @qdrant/js-client-rest openai bull ioredis prom-client winston
npm install @anthropic-ai/sdk

# Client
npm install recharts date-fns papaparse
```

---

## Embedding & Vector Store Setup

### Qdrant client — `server/config/qdrant.js`

```js
const { QdrantClient } = require('@qdrant/js-client-rest');
const client = new QdrantClient({ url: process.env.QDRANT_URL || 'http://localhost:6333' });
module.exports = client;
```

### Collection initialisation — `server/config/initQdrant.js`

On server startup (called in `index.js` before the HTTP server opens), ensure both collections exist:

```js
async function initQdrant() {
  const client = require('./qdrant');
  for (const name of ['user_skills', 'community_posts']) {
    const exists = await client.collectionExists(name);
    if (!exists) {
      await client.createCollection(name, {
        vectors: { size: 1536, distance: 'Cosine' }
        // 1536 = OpenAI text-embedding-3-small output dimensions
      });
    }
  }
}
```

### Embedding service — `server/services/embeddingService.js`

```js
const OpenAI = require('openai');
const qdrant = require('../config/qdrant');
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function embed(text) {
  const res = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text.slice(0, 8000)  // token limit guard
  });
  return res.data[0].embedding;
}

// Upsert a user's skill embedding into user_skills collection
async function upsertUserEmbedding(user) {
  const text = user.skillsToTeach
    .map(s => `${s.skillId?.name || ''}: ${s.description || ''}`)
    .join('. ');
  if (!text.trim()) return;
  const vector = await embed(text);
  await qdrant.upsert('user_skills', {
    points: [{ id: user._id.toString(), vector, payload: { userId: user._id.toString(), college: user.college } }]
  });
}

// Upsert a post embedding into community_posts collection
async function upsertPostEmbedding(post) {
  const text = `${post.title}. ${post.body}`.slice(0, 4000);
  const vector = await embed(text);
  await qdrant.upsert('community_posts', {
    points: [{ id: post._id.toString(), vector, payload: { postId: post._id.toString(), communityId: post.communityId.toString(), tags: post.tags } }]
  });
}

module.exports = { embed, upsertUserEmbedding, upsertPostEmbedding };
```

---

## Bull Job Queue

### Queue definitions — `server/workers/queues.js`

```js
const Bull = require('bull');
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

const embeddingQueue  = new Bull('embedding',  REDIS_URL);
const moderationQueue = new Bull('moderation', REDIS_URL);
const emailQueue      = new Bull('email',      REDIS_URL);

module.exports = { embeddingQueue, moderationQueue, emailQueue };
```

### Job triggers

| Queue | Job Name | Triggered By |
|---|---|---|
| `embeddingQueue` | `embedUser` | `PUT /api/users/me` (profile or skill updated) |
| `embeddingQueue` | `embedPost` | `POST /api/communities/:id/posts` (new post) |
| `moderationQueue` | `moderatePost` | `POST /api/communities/:id/posts` |
| `moderationQueue` | `moderateComment` | `POST /api/posts/:id/comments` |
| `emailQueue` | `sendReminder` | Session confirmed — schedule T-24h, T-1h, T-10m |
| `emailQueue` | `sendMatchEmail` | New `MATCHED` match created |

Create `server/workers/index.js` as the worker process entry point (separate Docker service). Register processors for all queues. Use `process.on('uncaughtException')` and `process.on('unhandledRejection')` to prevent worker crashes. Log all job failures to Winston.

---

## New RESTful API Endpoints — Stage 3

### Semantic & Hybrid Matching — `/api/matches`

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/ai/embed/user/:id` | Admin or self only. Enqueue an `embedUser` job. Return 202 `{ queued: true }`. |
| `POST` | `/api/ai/embed/all` | Admin only. Enqueue `embedUser` jobs for all users with at least one `skillToTeach`. Return 202 `{ queued: count }`. |
| `GET` | `/api/matches/semantic` | Search Qdrant `user_skills` for top-20 nearest neighbours to the current user's vector. Filter by college if `?campus=true`. Exclude already-interacted users. Hydrate from MongoDB. Return profile cards identical in shape to `/api/matches/suggestions`. |
| `GET` | `/api/matches/hybrid` | Fetch top-40 semantic candidates from Qdrant. Compute hybrid score: `score = 0.6 × cosineSimilarity + 0.2 × normalise(reputationScore) + 0.1 × normalise(sessionCount) + 0.1 × availabilityOverlapRatio`. Sort desc, return top 20. Cache per user for 5 minutes in Redis. |

### AI Session Tools — `/api/ai/session`

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/ai/session/:id/plan` | Retrieve session topic + learner's `skillsToLearn` description. Query Qdrant `community_posts` for top-5 similar posts (RAG context). Call Claude Sonnet API with session plan system prompt. Return `{ plan: string, resources: string[], practiceProblems: string[] }`. Cache result on the session document. |
| `GET` | `/api/ai/session/:id/plan` | Return cached lesson plan from `session.aiPlan`. Return 404 if not yet generated. |
| `POST` | `/api/ai/session/:id/summary` | Consent required: both `session.mentorId` and `session.learnerId` must have called `PUT /api/sessions/:id/consent`. Extract last 200 messages from match chat. Call Claude API. Return `{ summary, nextSteps, keyTakeaways }`. Store on `session.aiSummary`. |
| `GET` | `/api/ai/resources` | Query: `?topic=<string>&limit=5`. Embed the topic. Search Qdrant `community_posts`. Hydrate post titles + URLs. Also call Claude API to suggest 3 external resources. Return combined list. |

### Community AI Tools — `/api/ai/posts`

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/posts/:id/summary` | Call Claude API with post title + body + top 5 comments by upvotes. Return `{ summary: string }`. Cache on `post.aiSummary` with 24h TTL in Redis. |
| `GET` | `/api/posts/:id/duplicates` | Embed the post title. Search Qdrant `community_posts` for top-5 similar posts (cosine > 0.85) excluding the post itself. Return `{ duplicates: Post[] }`. |
| `POST` | `/api/ai/posts/autotag` | Called internally on new post creation. Body: `{ postId }`. Call Claude API to classify topic tags (max 5) and difficulty. Update `post.tags` and `post.difficultyTag`. Return `{ tags, difficulty }`. |

### Analytics Dashboard — `/api/analytics`

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/analytics/campus` | Admin or moderator only. Returns: `{ topSkills: [{skill, count}], activeUsers, sessionsThisMonth, topCommunities: [{name, postCount}], peakHours: [{hour, sessionCount}] }`. Use MongoDB aggregation pipelines. |
| `GET` | `/api/analytics/mentor/:id` | Self or admin. Returns: `{ sessionsTeaught, avgRating, uniqueLearners, skillBreakdown: [{skill, sessions}], reputationHistory: [{date, score}] }`. |
| `GET` | `/api/analytics/demand` | Returns: `{ skills: [{ skillId, name, wantToLearnCount, teacherCount, gap }] }` sorted by gap desc. Used for the skill demand heatmap. |
| `GET` | `/api/analytics/retention` | Admin only. Returns 4-week cohort table: `{ cohorts: [{ week, newUsers, retained: [w1, w2, w3, w4] }] }`. |
| `GET` | `/api/analytics/export` | Admin only. Query: `?type=sessions\|users\|posts&from=ISO&to=ISO`. Stream a CSV file using `json2csv`. Set `Content-Type: text/csv`. |

---

## LLM Prompt Specifications

Store all system prompts in `server/services/prompts.js` as exported string constants. All LLM calls go through `server/services/llmService.js` to centralise error handling and response parsing.

### Session plan prompt

```
You are an expert peer learning coach for student communities.
Given a session topic, learner profile, and relevant community posts, generate a
structured 60-minute lesson plan in JSON format with these exact keys:
{ plan: string, resources: string[], practiceProblems: string[] }
- plan: a concise markdown string with 4-6 timed sections (e.g. '0-5 min: intro')
- resources: array of 3-5 external URLs or resource names relevant to the topic
- practiceProblems: array of 3-5 specific exercises or questions
Respond ONLY with valid JSON. No preamble, no markdown code fences.
```

### Post summary prompt

```
You are a community moderator assistant for a student skill-exchange platform.
Summarise the following forum thread (post + top comments) in 3-5 sentences.
Focus on: the core question, the accepted or best answer, and key insights.
Respond ONLY with a plain text paragraph. No bullet points, no markdown.
```

### Auto-tag prompt

```
You are a content classifier for an educational forum.
Given a post title and body, output a JSON object with exactly two keys:
{ tags: string[], difficulty: 'Beginner' | 'Intermediate' | 'Advanced' }
- tags: 1-5 topic tags chosen from the student's knowledge domain
- difficulty: the technical depth level of the content
Respond ONLY with valid JSON. No preamble, no markdown code fences.
```

### Content moderation prompt

```
You are a content safety classifier for a student learning platform.
Given a text, output a JSON object: { flagged: boolean, reason: string | null, severity: 'low'|'medium'|'high'|null }
Flag content that is: hate speech, harassment, sexual content, spam, or off-topic advertising.
Do NOT flag: academic debate, mild frustration, technical jargon, discussion of sensitive topics.
Respond ONLY with valid JSON. No preamble, no markdown code fences.
```

### LLM service — `server/services/llmService.js`

```js
const Anthropic = require('@anthropic-ai/sdk');
const logger = require('../utils/logger');
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

async function callClaude(systemPrompt, userMessage, maxTokens = 1000) {
  try {
    const msg = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }]
    });
    return msg.content[0].text;
  } catch (err) {
    logger.error('LLM call failed', { error: err.message });
    throw err;
  }
}

async function callClaudeJSON(systemPrompt, userMessage, maxTokens = 500) {
  const raw = await callClaude(systemPrompt, userMessage, maxTokens);
  const cleaned = raw.replace(/```json|```/g, '').trim();
  return JSON.parse(cleaned);
}

module.exports = { callClaude, callClaudeJSON };
```

---

## Hybrid Matching Algorithm

Implement `getHybridMatches(userId)` in `server/services/matchingService.js`:

```js
async function getHybridMatches(userId) {
  const user = await User.findById(userId).populate('skillsToTeach.skillId').lean();
  if (!user) throw new Error('User not found');

  // 1. Semantic: fetch top-40 nearest neighbours from Qdrant
  const qResult = await qdrant.search('user_skills', {
    vector: await embed(buildSkillText(user)),
    limit: 40,
    filter: { must: [{ key: 'college', match: { value: user.college } }] },
    with_payload: true
  });

  const candidateIds = qResult.map(r => r.id).filter(id => id !== userId.toString());

  // 2. Fetch MongoDB profiles for candidates
  const candidates = await User.find({ _id: { $in: candidateIds } })
    .select('name avatarUrl college reputationScore skillsToTeach skillsToLearn availability badges')
    .lean();

  // 3. Compute session count per candidate
  const sessionCounts = await Session.aggregate([
    { $match: { $or: [{ mentorId: { $in: candidateIds } }, { learnerId: { $in: candidateIds } }], status: 'DONE' } },
    { $group: { _id: '$mentorId', count: { $sum: 1 } } }
  ]);
  const sessionCountMap = Object.fromEntries(sessionCounts.map(s => [s._id.toString(), s.count]));

  // 4. Compute hybrid score and sort
  const maxRep = Math.max(...candidates.map(c => c.reputationScore), 1);
  const maxSessions = Math.max(...Object.values(sessionCountMap), 1);
  const overlapRatios = await Promise.all(candidates.map(c => computeOverlapRatio(user, c)));

  const scored = candidates.map((c, i) => {
    const semantic = qResult.find(r => r.id === c._id.toString())?.score || 0;
    const rep      = c.reputationScore / maxRep;
    const sessions = (sessionCountMap[c._id.toString()] || 0) / maxSessions;
    const overlap  = overlapRatios[i];
    const score    = 0.6*semantic + 0.2*rep + 0.1*sessions + 0.1*overlap;
    return { ...c, _hybridScore: score };
  });

  return scored.sort((a, b) => b._hybridScore - a._hybridScore).slice(0, 20);
}
```

---

## Prometheus Metrics

Create `server/utils/metrics.js` using the `prom-client` library. Expose at `GET /metrics` (require `METRICS_SECRET` header). Register a metrics middleware in `server/middleware/metrics.js` as the first middleware in `index.js`.

| Metric Name | Type | Labels / Notes |
|---|---|---|
| `skillEX_http_requests_total` | Counter | `method`, `route`, `status_code` |
| `skillEX_http_request_duration_seconds` | Histogram | Buckets: 0.05, 0.1, 0.3, 0.5, 1, 2 |
| `skillEX_active_socket_connections` | Gauge | Incremented on connect, decremented on disconnect |
| `skillEX_llm_calls_total` | Counter | `endpoint` label (session_plan, autotag, moderate, etc.) |
| `skillEX_llm_call_duration_seconds` | Histogram | LLM call latency |
| `skillEX_embedding_queue_depth` | Gauge | Current Bull queue size for `embeddingQueue` |
| `skillEX_sessions_created_total` | Counter | Incremented on each `POST /api/sessions` |
| `skillEX_matches_created_total` | Counter | Incremented when status becomes `MATCHED` |

---

## Winston Structured Logging

Create `server/utils/logger.js`. Replace all `console.log()` calls throughout the codebase.

```js
const { createLogger, format, transports } = require('winston');

const logger = createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: format.combine(
    format.timestamp(),
    format.errors({ stack: true }),
    process.env.NODE_ENV === 'development' ? format.prettyPrint() : format.json()
  ),
  transports: [
    new transports.Console(),
    new transports.File({ filename: 'logs/error.log', level: 'error' }),
    new transports.File({ filename: 'logs/combined.log' })
  ]
});

module.exports = logger;
```

Log levels: **INFO** for API requests, session creation, match creation. **WARN** for failed auth attempts, rate limit hits. **ERROR** for DB errors, LLM failures, queue failures. Include `{ userId, route, duration }` in every request log.

---

## GitHub Actions CI/CD

Create `.github/workflows/ci.yml`:

```yaml
name: CI/CD

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test-server:
    runs-on: ubuntu-latest
    services:
      mongo:
        image: mongo:7
        ports: ["27017:27017"]
      redis:
        image: redis:7-alpine
        ports: ["6379:6379"]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: "20" }
      - run: cd server && npm ci
      - run: cd server && npm test
        env:
          MONGO_URI: mongodb://localhost:27017/skillEX_test
          JWT_ACCESS_SECRET: test_secret_64_chars_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
          JWT_REFRESH_SECRET: test_refresh_64_chars_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa

  test-client:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: "20" }
      - run: cd client && npm ci
      - run: cd client && npm run build

  deploy:
    needs: [test-server, test-client]
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Deploy to Railway
        run: npx @railway/cli up --service api
        env: { RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }} }
```

---

## Analytics Dashboard — Frontend

Create `client/src/pages/AdminAnalytics.tsx`. Guard with a `ProtectedRoute` component that checks `role === 'admin' || role === 'moderator'`.

### Dashboard components (all using Recharts)

| Component | Specification |
|---|---|
| **KPI Cards Row** | 4 cards: Total Users, Sessions This Month, Active Communities, Avg Session Rating. `SimpleGrid columns={{ base: 1, sm: 2, lg: 4 }}`. |
| **Top Skills BarChart** | Horizontal `BarChart layout='vertical'` of top 10 `skillsToLearn`. X-axis: demand count. Tooltip: skill name + teacher count + gap. |
| **Skill Demand Heatmap** | Recharts `ScatterChart`. X-axis: teacherCount, Y-axis: wantToLearnCount. Dots above the y=x line are undersupplied skills (highlight in amber). |
| **Peak Hours AreaChart** | 24-hour `AreaChart` showing session count by hour. X-axis: 0–23. Gradient fill amber-400 to amber-100. |
| **Retention Cohort Table** | HTML table with weeks as columns and cohorts as rows. Cell background: green >50%, amber 20–50%, red <20%. |
| **CSV Export Button** | Calls `GET /api/analytics/export?type=sessions` with a date range picker. Triggers file download via `Blob` URL. Use `date-fns` for default "last 30 days" range. |

---

## New Environment Variables

Add to `server/.env.example`:

```env
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
QDRANT_URL=http://localhost:6333
REDIS_URL=redis://localhost:6379
GOOGLE_TOKEN_SECRET=<32-byte-hex-for-AES-256-CBC>
METRICS_SECRET=<random-secret-to-protect-/metrics-endpoint>
LOG_LEVEL=info
FIREBASE_SERVICE_ACCOUNT=<base64-encoded-service-account-json>
```

---

## Sprint Breakdown & Acceptance Criteria

| Week | Tasks | Done When |
|---|---|---|
| 15 | Docker Compose with all 6 services, Qdrant collection init, `embeddingService.js`, Bull queues, `embedUser` + `embedPost` processors, `POST /api/ai/embed/user/:id` | `docker-compose up` brings all services; Qdrant `/collections` shows `user_skills` and `community_posts` with vector count > 0 |
| 16 | Hybrid match scoring, `GET /api/matches/semantic`, `GET /api/matches/hybrid`, Redis caching (5-min TTL), A/B test flag per user | `GET /api/matches/hybrid` returns 20 users sorted by score; repeat call within 5 min returns cache hit (verify via `X-Cache` header) |
| 17 | `llmService.js` with all prompts, `POST /api/ai/session/:id/plan` (RAG + Claude), Prepare Session UI button, `POST /api/ai/session/:id/summary` (consent gate), `GET /api/ai/resources` | Session plan returns valid JSON with `plan`, `resources`, `practiceProblems` keys; consent endpoint returns 403 if one user hasn't consented |
| 18 | Auto-tag job on post creation, `GET /api/posts/:id/duplicates` (Qdrant threshold 0.85), `GET /api/posts/:id/summary` (Claude + Redis cache), content moderation worker | New post gets tags within 10s; duplicate endpoint returns posts with cosine > 0.85; moderation worker flags test hate-speech input and notifies admin |
| 19 | All `/api/analytics/*` endpoints with MongoDB aggregation, `AdminAnalytics.tsx` with all 6 chart components, CSV export, `ProtectedRoute` for admin/moderator | Analytics page renders all 6 visualisations at 375px mobile; CSV download triggers file save; non-admin user redirected from `/admin/analytics` |
| 20 | Prometheus metrics middleware, Winston structured logging replacing all `console.log` calls, Grafana dashboard JSON (provisioned), GitHub Actions CI pipeline, k6 load test (100 VU, 60s), final responsive QA pass | `GET /metrics` returns all 8 custom metrics; CI passes on push; k6 report shows p95 < 500ms at 100 VU; all three breakpoints pass visual QA |

---

## Privacy & Data Governance Checklist

Complete all items before the Stage 3 deployment sign-off:

1. LLM calls that process chat logs or session notes require both users to have called `PUT /api/sessions/:id/consent` with `{ aiSummaryConsent: true }`. The `/summary` endpoint returns 403 if either flag is false.
2. Qdrant `user_skills` vectors store only `{ userId, college }` as payload. No name, email, or any PII is stored in the vector database.
3. Qdrant `community_posts` vectors store only `{ postId, communityId, tags }` as payload. No post body text is stored in the vector database.
4. All Google Calendar OAuth tokens are encrypted at rest using AES-256-CBC before storage in MongoDB. Decrypt only at the time of the API call.
5. Content moderation agent outputs are written to a `ModerationResult` collection. The agent never auto-bans — it only queues for human review.
6. Implement `DELETE /api/users/me/data` endpoint: delete user's MongoDB documents, Qdrant vector, Firebase FCM token, and Google Calendar tokens. Return 204.
7. Grafana and Prometheus dashboards must be deployed behind HTTP Basic Auth. Never expose `/metrics` without the `METRICS_SECRET` header check.
8. All LLM API keys (`OPENAI_API_KEY`, `ANTHROPIC_API_KEY`) must be stored as Railway/Render environment secrets — never committed to the repository.
