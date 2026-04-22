# SkillEX — Stage 1 Development Prompt
**MVP Core — Foundation, Auth & Community**

> **Stack:** MERN + Socket.IO + JWT &nbsp;|&nbsp; **Deployment:** Railway + Vercel

---

## Context & Project Overview

You are a senior full-stack engineer building **SkillEX** — a peer-to-peer skill exchange platform for students. The app lets students list skills they can teach and skills they want to learn, match with peers, book 1:1 sessions, chat in real-time, participate in subject-based community forums, and earn XP and badges for teaching and learning activity.

This is **Stage 1** of a 3-stage MERN stack project. Your job is to build the complete MVP from scratch: project scaffolding, database models, RESTful API, real-time chat, and a responsive React frontend. Write production-quality, well-commented code.

---

## Tech Stack Constraints

Use exactly the following stack. Do not substitute alternatives unless explicitly noted.

| Layer | Technology | Notes |
|---|---|---|
| Runtime & Framework | Node.js 20 LTS + Express 4.x | REST API server |
| Database | MongoDB Atlas (free tier) via Mongoose 8.x | Use `.env` for connection string |
| Authentication | JWT access tokens (15 min expiry) + refresh tokens (7-day, httpOnly cookies) | Passport.js with `passport-local` and `passport-google-oauth20` |
| Real-time | Socket.IO 4.x | Attached to same Express HTTP server; rooms keyed by `matchId` |
| File Upload | Multer + Cloudinary SDK | Return `secure_url` |
| Email | Nodemailer | SMTP env vars; HTML templates for reminders |
| Frontend | React 18 + Vite, TypeScript, React Router v6, Chakra UI v2, TanStack Query v5, Zustand, Axios with interceptors | — |
| Calendar | FullCalendar React component | Week/month views |
| Testing | Jest + Supertest (API), Vitest (React) | — |

---

## Project Structure

Scaffold the monorepo with the following layout. Use this structure throughout all code generation.

```
skillEX/
├── server/
│   ├── config/           # db.js, passport.js, cloudinary.js, nodemailer.js
│   ├── models/           # User.js, Skill.js, Match.js, Session.js, Post.js, Comment.js, Community.js
│   ├── routes/           # auth.js, users.js, matches.js, chat.js, sessions.js, community.js, gamification.js
│   ├── middleware/        # auth.js (verifyToken), rbac.js, upload.js, errorHandler.js
│   ├── services/         # matchingService.js, notificationService.js, xpService.js, emailService.js
│   ├── sockets/          # chatHandler.js, presenceHandler.js
│   ├── utils/            # validators.js, slotOverlap.js, paginate.js
│   ├── tests/            # auth.test.js, matches.test.js, sessions.test.js
│   ├── .env.example
│   └── index.js
│
└── client/
    ├── src/
    │   ├── api/          # authApi.ts, matchApi.ts, sessionApi.ts, communityApi.ts
    │   ├── components/   # Navbar, MatchCard, ChatBox, CalendarView, PostCard, BadgeDisplay
    │   ├── pages/        # Landing, Onboarding, Profile, Discover, Chat, Sessions, Community, Leaderboard
    │   ├── hooks/        # useAuth.ts, useSocket.ts, useMatches.ts
    │   ├── store/        # authStore.ts, socketStore.ts
    │   ├── types/        # user.ts, match.ts, session.ts, post.ts
    │   └── utils/        # axiosInstance.ts, formatDate.ts
    └── vite.config.ts
```

---

## MongoDB Data Models

Generate all Mongoose schemas with the exact fields below. Add Mongoose validation (`required`, `minlength`, `enum`) and `timestamps: true` on every schema.

### User Schema

```js
// server/models/User.js
const UserSkillSchema = new Schema({
  skillId:     { type: Schema.Types.ObjectId, ref: 'Skill', required: true },
  role:        { type: String, enum: ['TEACH', 'LEARN'], required: true },
  level:       { type: String, enum: ['Beginner', 'Intermediate', 'Advanced'] },
  description: { type: String, maxlength: 300 },
  evidence:    [String]  // URLs to GitHub, Behance, LinkedIn
});

const AvailabilitySlotSchema = new Schema({
  dayOfWeek:  { type: Number, min: 0, max: 6, required: true },
  startTime:  { type: String, required: true },  // 'HH:MM' 24h
  endTime:    { type: String, required: true },
  mode:       { type: String, enum: ['ONLINE', 'OFFLINE', 'HYBRID'], default: 'ONLINE' }
});

const UserSchema = new Schema({
  name:            { type: String, required: true, trim: true },
  email:           { type: String, required: true, unique: true, lowercase: true },
  passwordHash:    { type: String },  // undefined for OAuth users
  googleId:        { type: String },
  college:         { type: String, required: true },
  year:            { type: Number, min: 1, max: 6 },
  branch:          { type: String },
  bio:             { type: String, maxlength: 500 },
  avatarUrl:       { type: String, default: '' },
  skillsToTeach:   [UserSkillSchema],
  skillsToLearn:   [UserSkillSchema],
  availability:    [AvailabilitySlotSchema],
  reputationScore: { type: Number, default: 0 },
  xp:              { type: Number, default: 0 },
  teacherLevel:    { type: Number, default: 1 },
  learnerLevel:    { type: Number, default: 1 },
  badges:          [{ name: String, awardedAt: Date }],
  verified:        { type: Boolean, default: false },
  role:            { type: String, enum: ['user', 'moderator', 'admin'], default: 'user' }
}, { timestamps: true });
```

### Match & Message Schemas

```js
// server/models/Match.js
const MessageSchema = new Schema({
  senderId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  body:     { type: String, required: true, maxlength: 2000 },
  readAt:   { type: Date },
}, { timestamps: true });

const MatchSchema = new Schema({
  users:        { type: [{ type: Schema.Types.ObjectId, ref: 'User' }], validate: v => v.length === 2 },
  interactions: [{ userId: Schema.Types.ObjectId, action: { type: String, enum: ['accept','skip','superlike'] }, at: Date }],
  status:       { type: String, enum: ['PENDING', 'MATCHED', 'UNMATCHED'], default: 'PENDING' },
  matchedAt:    { type: Date },
  messages:     [MessageSchema]
}, { timestamps: true });
```

### Session Schema

```js
// server/models/Session.js
const SessionSchema = new Schema({
  mentorId:       { type: Schema.Types.ObjectId, ref: 'User', required: true },
  learnerId:      { type: Schema.Types.ObjectId, ref: 'User', required: true },
  topic:          { type: String, required: true },
  mode:           { type: String, enum: ['ONLINE', 'OFFLINE'], required: true },
  status:         { type: String, enum: ['PROPOSED','CONFIRMED','CANCELLED','DONE'], default: 'PROPOSED' },
  scheduledStart: { type: Date, required: true },
  scheduledEnd:   { type: Date, required: true },
  feedback:       { rating: { type: Number, min: 1, max: 5 }, comment: String, submittedAt: Date }
}, { timestamps: true });
```

### Post & Comment Schemas

```js
// server/models/Post.js
const PostSchema = new Schema({
  communityId:       { type: Schema.Types.ObjectId, ref: 'Community', required: true },
  authorId:          { type: Schema.Types.ObjectId, ref: 'User', required: true },
  title:             { type: String, required: true, maxlength: 200 },
  body:              { type: String, required: true },
  postType:          { type: String, enum: ['QUESTION','DISCUSSION','RESOURCE','POLL'], required: true },
  tags:              [String],
  upvotes:           { type: Number, default: 0 },
  acceptedCommentId: { type: Schema.Types.ObjectId, ref: 'Comment' }
}, { timestamps: true });

const CommentSchema = new Schema({
  postId:          { type: Schema.Types.ObjectId, ref: 'Post', required: true },
  authorId:        { type: Schema.Types.ObjectId, ref: 'User', required: true },
  body:            { type: String, required: true, maxlength: 3000 },
  parentCommentId: { type: Schema.Types.ObjectId, ref: 'Comment', default: null },
  upvotes:         { type: Number, default: 0 }
}, { timestamps: true });
```

---

## RESTful API Specification

Implement all routes using Express Router. Mount each router in `index.js` under `/api`. All protected routes must use the `verifyToken` middleware. Return JSON with the shape `{ success: true, data: ... }` on success and `{ success: false, error: '...' }` on error. Use HTTP status codes correctly.

### Auth Routes — `/api/auth`

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/auth/register` | Accept `{ name, email, password, college }`. Hash password with bcrypt (12 rounds). Send verification email via Nodemailer. Return 201 + user object (no `passwordHash`). |
| `POST` | `/api/auth/login` | Validate credentials. Return 200 + `{ accessToken }` in body + `refreshToken` as httpOnly Secure cookie. Access token expires in 15 min, refresh token in 7 days. |
| `POST` | `/api/auth/refresh` | Read `refreshToken` cookie. Verify against stored hash in DB. Issue new `accessToken`. Rotate `refreshToken` (sliding window). Return 200 + `{ accessToken }`. |
| `POST` | `/api/auth/oauth/google` | Passport Google OAuth2 callback. On success, upsert user by `googleId`. Return same token pair as `/login`. |
| `POST` | `/api/auth/logout` | Delete `refreshToken` from DB. Clear cookie. Return 204. |

### User & Profile Routes — `/api/users`

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/users/:id` | Return public profile. Populate `skillsToTeach.skillId` and `skillsToLearn.skillId`. Omit `passwordHash`, `googleId`. |
| `PUT` | `/api/users/me` | Update bio, college, year, branch, avatarUrl. Disallow email/password change here. Return updated user. |
| `POST` | `/api/users/me/skills` | Body: `{ skillId, role, level, description, evidence[] }`. Push to `skillsToTeach` or `skillsToLearn`. Return updated user. |
| `PUT` | `/api/users/me/skills/:skillId` | Update an existing `UserSkill` subdocument by `_id`. Return updated user. |
| `DELETE` | `/api/users/me/skills/:skillId` | Pull the `UserSkill` from the array. Return 204. |
| `PUT` | `/api/users/me/availability` | Replace full availability array. Body: `[{ dayOfWeek, startTime, endTime, mode }]`. Return updated user. |
| `POST` | `/api/users/me/avatar` | Multipart form (field: `avatar`). Upload to Cloudinary. Update `avatarUrl`. Return `{ avatarUrl }`. |

### Matching Routes — `/api/matches`

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/matches/suggestions` | Query params: `skill`, `level`, `campus`, `mode`, `page`, `limit` (default 20). Filter users whose `skillsToTeach` contains what the current user wants to learn (and vice versa). Exclude users already interacted with. Return paginated cards with profile summary. |
| `POST` | `/api/matches/:userId/interact` | Body: `{ action: 'accept'\|'skip'\|'superlike' }`. Record interaction. If both users have accepted each other, set `status='MATCHED'` and `matchedAt=now`. Return `{ matched: boolean }`. |
| `GET` | `/api/matches` | Return all `MATCHED` matches for the current user. Populate other user's profile summary. |
| `GET` | `/api/matches/:id` | Return single match with populated users and last 50 messages. |

### Chat Routes — `/api/chats`

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/chats/:matchId/messages` | Verify requesting user is in `match.users`. Paginate messages: query `?before=<messageId>&limit=50`. Return array oldest→newest. |
| `PUT` | `/api/chats/:matchId/messages/read` | Mark all messages in match as read where `senderId ≠ current user` and `readAt` is null. Set `readAt=now`. |

### Session Routes — `/api/sessions`

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/sessions` | Body: `{ learnerId, topic, mode, scheduledStart, scheduledEnd }`. Proposer becomes `mentorId`. Check that `scheduledStart < scheduledEnd` and duration is 30, 60, or 90 minutes. Return 201 + session. |
| `GET` | `/api/sessions` | Return all sessions for current user (as mentor or learner). Populate both user profiles. Query `?status=PROPOSED\|CONFIRMED\|DONE`. |
| `PUT` | `/api/sessions/:id/confirm` | Only the non-proposing user may confirm. Set `status='CONFIRMED'`. Schedule Nodemailer reminder jobs (T-24h, T-1h, T-10min). Return updated session. |
| `PUT` | `/api/sessions/:id/cancel` | Either user may cancel. Set `status='CANCELLED'`. Cancel reminder jobs. Return updated session. |
| `POST` | `/api/sessions/:id/feedback` | Only allowed when `status='DONE'`. Body: `{ rating, comment }`. Trigger XP award via `xpService`. Return updated session. |
| `GET` | `/api/calendar/slots` | Return all `CONFIRMED` sessions as FullCalendar-compatible events: `{ id, title, start, end, extendedProps }`. |
| `GET` | `/api/calendar/overlap/:userId` | Compute overlapping `AvailabilitySlots` between current user and `:userId` for next 14 days. Return `[{ start, end }]`. |

### Community Routes — `/api/communities`, `/api/posts`

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/communities` | Return all communities sorted by `memberCount` desc. Include post count for each. |
| `GET` | `/api/communities/:id/posts` | Paginate posts (`page`, `limit=20`). Sort by `?sort=new\|top\|hot`. Populate `authorId` with `name + avatarUrl`. |
| `POST` | `/api/communities/:id/posts` | Body: `{ title, body, postType, tags[] }`. `authorId` = current user. Return 201 + post. Award XP via `xpService`. |
| `GET` | `/api/posts/:id` | Return post with nested comments (threaded, sorted by upvotes). Populate author on each. |
| `POST` | `/api/posts/:id/comments` | Body: `{ body, parentCommentId? }`. Return 201 + comment. Award XP. |
| `POST` | `/api/posts/:id/react` | Body: `{ type: 'upvote'\|'downvote' }`. Toggle reaction (remove if same type re-submitted). Atomically increment/decrement `upvotes`. |
| `PUT` | `/api/posts/:id/accept/:commentId` | Only post author may call. Set `post.acceptedCommentId`. Award XP to comment author. |

### Gamification Routes — `/api/gamification`

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/gamification/me` | Return `{ xp, teacherLevel, learnerLevel, badges[], rank }`. |
| `GET` | `/api/gamification/leaderboard` | Query: `?scope=campus\|global&subject=<skillId>&limit=50`. Return ranked list `{ rank, user: { name, avatarUrl, college }, xp, badges }`. |

---

## Socket.IO Real-time Specification

Implement the following Socket.IO events in `server/sockets/chatHandler.js`. All socket connections must be authenticated: extract the JWT from `handshake.auth.token` and verify before allowing the connection.

### Server-side events (emit to client)

| Event | Payload & Behaviour |
|---|---|
| `message:new` | `{ matchId, message: { _id, senderId, body, createdAt } }`. Emit to room `matchId`. Persist to DB via `Match.findByIdAndUpdate` with `$push`. |
| `message:read` | `{ matchId, readAt }`. Emit to room when the other user reads messages. |
| `user:typing` | `{ matchId, userId, isTyping: bool }`. Broadcast to room except sender. Debounce: stop typing after 3 s of no events. |
| `user:presence` | `{ userId, online: bool }`. Broadcast to all rooms the user is in. Track online users in a `Map<socketId, userId>` on the server. |
| `match:new` | `{ match }`. Emit to both users' personal rooms (`userId`) when a new `MATCHED` match is created. |

### Client-side events (listen from client)

| Event | Expected Payload & Server Action |
|---|---|
| `chat:join` | `{ matchId }`. Server calls `socket.join(matchId)`. Verify user is in `match.users` before joining. |
| `chat:send` | `{ matchId, body }`. Server saves message to DB then emits `message:new` to room. |
| `chat:typing` | `{ matchId, isTyping }`. Server rebroadcasts `user:typing` to room except sender. |
| `chat:read` | `{ matchId }`. Server updates `readAt` and emits `message:read` to room. |

---

## XP & Gamification Logic

Implement in `server/services/xpService.js`. Export a single function `awardXP(userId, action)` that increments `xp`, updates level thresholds, and checks badge criteria.

| Action Trigger | XP Awarded | Badge Check |
|---|---|---|
| Session completed (mentor) | +50 XP | Top Mentor badge at 10 sessions taught |
| Session completed (learner) | +30 XP | First Session badge on first completion |
| Post accepted answer | +20 XP | Community Helper badge at 10 accepted answers |
| Post upvoted (+1 per upvote) | +5 XP | — |
| Comment upvoted (+1 per upvote) | +3 XP | — |
| Profile fully completed (one-time) | +25 XP | Profile Complete badge |
| 7-day login streak | +15 XP/week | Consistency Streak badge |

Level thresholds: Level 1 = 0 XP, Level 2 = 100 XP, Level 3 = 300 XP, Level 4 = 600 XP, Level 5 = 1000 XP. Use `Math.floor(1 + Math.sqrt(xp / 50))` as an approximation for higher levels.

---

## Frontend: Responsive UI Requirements

All pages must be fully responsive. Use Chakra UI's responsive prop syntax: e.g., `fontSize={{ base: 'sm', md: 'md', lg: 'lg' }}` and `SimpleGrid` with `minChildWidth`. The app must be usable on **375 px** (mobile), **768 px** (tablet), and **1280 px** (desktop).

### Required Pages & Components

| Page / Component | Key UI Requirements |
|---|---|
| Landing Page | Hero with tagline, feature highlights, CTA buttons (Sign Up / Log In). Two-column hero collapses to single column on mobile. |
| Onboarding Wizard | Multi-step form: (1) Basic info, (2) Skills-to-teach, (3) Skills-to-learn, (4) Availability grid. Progress bar at top. Skip optional steps. React Hook Form + Zod validation. |
| Discover Page | Card grid of match suggestions. Card shows avatar, name, college, top 2 teach skills, top 2 learn skills, badges. Accept/Skip/Superlike buttons. Infinite scroll via `useInfiniteQuery`. |
| Match Card Component | Flip card: front shows profile summary, back shows skills alignment + availability overlap. Click to flip. Swipe gestures on mobile (`@use-gesture/react`). |
| Chat Page | Split layout: left sidebar = matches list with unread count badge; right = message thread. Messages grouped by date. Typing indicator. Auto-scroll to bottom. Virtualized list for long histories. |
| Session Booking Modal | Triggered from chat. Step 1: topic + mode. Step 2: date picker with overlapping slots highlighted. Step 3: confirm. All within a Chakra `Drawer` on mobile. |
| Calendar Page | FullCalendar component. Week view default, month view toggle. Session events clickable to see details. Mobile: agenda view only. |
| Community Page | Left sidebar: community list. Main: post feed with filters (new/top/hot). Post card: title, tags, vote count, comment count, author. New Post FAB on mobile. |
| Post Detail Page | Post body + threaded comments. Accept answer button for post author. Upvote/downvote on each comment. Markdown preview via `react-markdown`. |
| Profile Page | Own: editable. Others: view-only. Sections: bio, teach skills, learn skills, badges, session history, reputation score. Avatar upload via drag-and-drop. |
| Leaderboard Page | Tabs: Campus / Global / By Subject. Top 50 ranked rows with avatar, name, XP, badge icons. Highlight current user's row. |

---

## Middleware & Error Handling

Implement the following in `server/middleware/`:

- **`verifyToken.js`** — Extract Bearer token from `Authorization` header. Call `jwt.verify()`. Attach decoded payload to `req.user`. Return 401 if missing or expired.
- **`rbac.js`** — Export `requireRole(...roles)` factory. Return 403 if `req.user.role` is not in the allowed list.
- **`upload.js`** — Multer `memoryStorage` instance. Export `uploadSingle(field)` and `uploadArray(field, max)`. Validate mime type (`image/jpeg`, `image/png`, `image/webp`) and max size 5 MB.
- **`errorHandler.js`** — Global Express error handler (4 args). Log stack in development. Return `{ success: false, error: message, ...(dev && { stack }) }`.
- **`rateLimiter.js`** — Use `express-rate-limit`. Apply 100 req/15 min to all `/api` routes. Apply 10 req/15 min to `/api/auth` routes.

---

## Environment Variables

Generate a complete `.env.example` in `server/`:

```env
NODE_ENV=development
PORT=5000
MONGO_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net/skillEX
JWT_ACCESS_SECRET=<random-64-char-hex>
JWT_REFRESH_SECRET=<random-64-char-hex>
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
CLIENT_URL=http://localhost:5173
```

---

## Code Quality Standards

- Every API route must have JSDoc comments describing params, body, and return shape.
- Use `async/await` throughout. Wrap all async route handlers with a `catchAsync(fn)` utility that forwards errors to the Express error handler.
- Validate all request bodies using `express-validator`. Return 422 with field-level errors on validation failure.
- Never store plain-text passwords. Always use `bcrypt.hash(password, 12)`.
- Use Mongoose `lean()` on read-only queries for performance. Avoid N+1 queries; use `$lookup` or Mongoose `populate` with `select` projection.
- TypeScript strict mode on the client. Define interfaces for all API response shapes in `src/types/`. Never use `any`.
- React components must not exceed 200 lines. Extract logic to custom hooks. Use `React.memo` on list-item components.
- All Chakra UI color props must use the theme token system (e.g., `colorScheme='blue'`). No hardcoded hex values in JSX.

---

## Sprint Breakdown & Acceptance Criteria

| Week | Tasks | Done When |
|---|---|---|
| 1–2 | MongoDB Atlas setup, Express scaffold, JWT auth + Google OAuth, User + Skill models, profile CRUD, Cloudinary avatar upload | `POST /api/auth/register` returns 201 + user; `POST /api/auth/login` returns access token; avatar upload returns Cloudinary URL |
| 3 | Vite + React + Chakra setup, Axios interceptor, Onboarding wizard (4 steps), Profile page (view + edit), React Query integration | Onboarding wizard completes without errors; profile page renders correctly on 375 px mobile |
| 4 | Matching engine filter logic, suggestions endpoint, MatchCard component with flip animation, swipe gestures, accept/skip/superlike API | Suggestions return only complement-matched users; mutual accept creates `MATCHED` status; card flips on click |
| 5 | Socket.IO chat — rooms, message persist, read receipts, typing indicator, online presence, Chat page UI | Two browser tabs can exchange real-time messages; typing indicator appears within 300 ms; unread count updates correctly |
| 6 | Session proposal flow, overlap slot algorithm, FullCalendar integration, Nodemailer reminders, Session booking modal | Session created with correct duration; overlapping slots highlighted in modal; reminder email sent on confirm |
| 7 | Community hub — communities, posts, threaded comments, upvote/downvote, accepted answer, tag filter, Post & Comment pages | Post created and appears in feed; comment threads nest correctly to 3 levels; upvote increments `post.upvotes` atomically |
| 8 | XP + badge engine, post-session feedback, Leaderboard page, responsive polish (375/768/1280 px), ESLint + Prettier, Jest tests, Railway + Vercel deploy | All 7 XP triggers award correct amounts; badges appear on profile; app renders correctly at all three breakpoints; CI passes |

---

## Deployment Checklist

1. All `.env` variables documented in `.env.example` with placeholder values.
2. MongoDB Atlas IP whitelist set to `0.0.0.0/0` for Railway deployment.
3. Cloudinary upload preset set to unsigned for client-side uploads (or use server-side signed upload).
4. Express app sets CORS origin to `CLIENT_URL` env variable. In production, disallow wildcard origins.
5. JWT secrets are at least 64 characters of random hex. Never commit real secrets.
6. All Socket.IO connections authenticate via `handshake.auth.token` before joining rooms.
7. Production build: `npm run build` in `client/`; Express serves `dist/` as static files on the same `PORT`.
8. Vercel project configured with output directory = `client/dist` and framework = Vite.
9. Railway service configured with root directory = `server/` and start command = `node index.js`.
10. Post-deploy: register one user, complete onboarding, match with a second test user, book a session, and verify the reminder email is received.
