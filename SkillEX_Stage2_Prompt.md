# SkillEX — Stage 2 Development Prompt
## Enhanced Features: Real-time, Groups & Video
**New:** WebRTC · Group Sessions · Google Calendar · RBAC

---

## Context

You are a senior full-stack engineer continuing the SkillEX project. Stage 1 (MVP Core) is complete: auth, profiles, filter-based matching, 1:1 chat, session booking, community forum, and basic gamification all work. Stage 2 adds swipe gestures, group sessions and study circles, WebRTC video calling, Google Calendar sync, reputation-gated community access, a full RBAC system, and richer notifications. Build on top of the existing codebase without breaking any Stage 1 functionality.

---

## Prerequisites & Codebase Context

Before writing any new code, read the following from the existing Stage 1 codebase:

- `server/models/` — all existing Mongoose schemas (User, Match, Session, Post, Comment, Community, Skill)
- `server/routes/` — all existing Express routers to avoid route conflicts
- `server/middleware/auth.js` — `verifyToken` and `requireRole` middleware already implemented
- `server/services/xpService.js` — existing XP/badge logic to extend
- `client/src/store/authStore.ts` — Zustand auth store shape (`user`, `accessToken`, `setUser`)
- `client/src/api/axiosInstance.ts` — Axios instance with interceptor for token refresh

Do not modify any Stage 1 schema in a backwards-incompatible way. You may add new fields with defaults. All new routes are additive.

---

## New Dependencies

```bash
# Server
npm install @daily-co/daily-js googleapis node-schedule firebase-admin

# Client
npm install @daily-co/daily-react framer-motion @use-gesture/react
npm install react-leaflet leaflet firebase
```

---

## New Data Models

Add these Mongoose schemas as new files in `server/models/`. Do not alter existing models except where noted.

### GroupSession Schema

```js
// server/models/GroupSession.js
const GroupSessionSchema = new Schema({
  hostId:       { type: Schema.Types.ObjectId, ref: 'User', required: true },
  communityId:  { type: Schema.Types.ObjectId, ref: 'Community' },
  title:        { type: String, required: true, maxlength: 150 },
  description:  { type: String, maxlength: 1000 },
  capacity:     { type: Number, min: 2, max: 20, default: 8 },
  mode:         { type: String, enum: ['ONLINE', 'OFFLINE'], required: true },
  startTime:    { type: Date, required: true },
  endTime:      { type: Date, required: true },
  visibility:   { type: String, enum: ['PUBLIC', 'PRIVATE'], default: 'PUBLIC' },
  resources:    [String],
  dailyRoomUrl: { type: String }   // populated when session is confirmed
}, { timestamps: true });
```

### GroupMember Schema

```js
// server/models/GroupMember.js
const GroupMemberSchema = new Schema({
  groupSessionId: { type: Schema.Types.ObjectId, ref: 'GroupSession', required: true },
  userId:         { type: Schema.Types.ObjectId, ref: 'User', required: true },
  role:           { type: String, enum: ['HOST', 'PARTICIPANT'], default: 'PARTICIPANT' },
  joinedAt:       { type: Date, default: Date.now },
  feedback:       { rating: { type: Number, min: 1, max: 5 }, comment: String }
}, { timestamps: true });
GroupMemberSchema.index({ groupSessionId: 1, userId: 1 }, { unique: true });
```

### Notification Schema

```js
// server/models/Notification.js
const NotificationSchema = new Schema({
  userId:      { type: Schema.Types.ObjectId, ref: 'User', required: true },
  type:        { type: String, required: true },  // 'SESSION_REMINDER', 'NEW_MATCH', etc.
  payloadJSON: { type: Schema.Types.Mixed },
  read:        { type: Boolean, default: false },
  channel:     { type: String, enum: ['PUSH', 'EMAIL', 'IN_APP'], default: 'IN_APP' }
}, { timestamps: true });
```

### User Schema Additions (additive only)

Add these fields to the existing `UserSchema` in `server/models/User.js`:

```js
googleCalendarTokens: {  // encrypted at rest using crypto.createCipheriv
  access_token:  String,
  refresh_token: String,
  expiry_date:   Number
},
notificationPrefs: {
  pushEnabled:  { type: Boolean, default: true },
  emailEnabled: { type: Boolean, default: true },
  fcmToken:     String   // Firebase Cloud Messaging device token
},
reportedBy: [{ type: Schema.Types.ObjectId, ref: 'User' }],
banned:     { type: Boolean, default: false }
```

---

## New RESTful API Endpoints

Mount all new routers in `index.js` alongside existing Stage 1 routes. Use the same `{ success, data }` / `{ success, error }` response envelope.

### Group Sessions — `/api/group-sessions`

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/group-sessions` | Body: `{ title, description, communityId?, capacity, mode, startTime, endTime, visibility, resources[] }`. `hostId = current user`. Insert `HOST` GroupMember. Return 201 + groupSession. |
| `GET` | `/api/group-sessions` | Query: `?communityId=&mode=&after=<ISO>&page=&limit=20`. Filter `PUBLIC` only (or `PRIVATE` if current user is a member). Sort by `startTime` asc. Populate host with name + avatarUrl + reputationScore. |
| `GET` | `/api/group-sessions/:id` | Return single group session with member list (populate `userId` with profile summary) and resource links. |
| `POST` | `/api/group-sessions/:id/join` | Check current members count < capacity. Insert `PARTICIPANT` GroupMember. If full, set `status='FULL'`. Emit `group:memberJoined` via Socket.IO. Return 201 + groupMember. |
| `DELETE` | `/api/group-sessions/:id/leave` | Remove GroupMember. If user is HOST, transfer host to oldest other PARTICIPANT or delete session if no members remain. Emit `group:memberLeft`. Return 204. |
| `PUT` | `/api/group-sessions/:id` | HOST only (ownership check). Update title, description, capacity, resources. Return updated session. |
| `DELETE` | `/api/group-sessions/:id` | HOST only. Set `status='CANCELLED'`. Notify all members via in-app notification. Return 204. |
| `POST` | `/api/group-sessions/:id/feedback` | PARTICIPANT only, after `endTime`. Body: `{ rating, comment }`. Update `GroupMember.feedback`. Return updated groupMember. |

### Video Call Routes — `/api/sessions` (additions)

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/sessions/:id/room` | `CONFIRMED` sessions only. Call Daily.co REST API (`POST /v1/rooms`) with `privacy:'private'`, `properties:{exp: scheduledEnd + 300s}`. Save returned URL to `session.dailyRoomUrl`. Return `{ roomUrl }`. |
| `POST` | `/api/sessions/:id/recording` | Both users must have accepted. Body: `{ enable: boolean }`. Call Daily.co `/v1/recordings/{start\|stop}`. Store consent flags on session. Return updated session. |
| `POST` | `/api/group-sessions/:id/room` | HOST only. Create Daily.co room for the group. Save to `groupSession.dailyRoomUrl`. Return `{ roomUrl }`. |

### Calendar & Notifications

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/calendar/google/auth` | Return the Google OAuth2 authorization URL with scope `calendar.events`. Include `state=<userId>` for CSRF protection. |
| `GET` | `/api/calendar/google/callback` | Exchange code for tokens. Encrypt with AES-256-CBC using `GOOGLE_TOKEN_SECRET` env var. Store in `user.googleCalendarTokens`. Redirect to client `/calendar?synced=true`. |
| `POST` | `/api/calendar/google/sync` | Decrypt tokens. Upsert a Google Calendar event for each `CONFIRMED` session in the next 30 days. Match on `extendedProperties.private.skillEXId`. Return `{ synced: count }`. |
| `GET` | `/api/notifications` | Paginate notifications newest-first. Query `?read=false` for unread only. Return `{ notifications, unreadCount }`. |
| `PUT` | `/api/notifications/:id/read` | Mark single notification as read. Return 204. |
| `PUT` | `/api/notifications/read-all` | Mark all user notifications as read. Return `{ updated: count }`. |
| `PUT` | `/api/notifications/settings` | Body: `{ pushEnabled, emailEnabled, fcmToken }`. Update `user.notificationPrefs`. Return updated prefs. |

### Moderation & Safety

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/users/:id/report` | Body: `{ reason, details }`. Push current user's ID to `target.reportedBy` if not already present. If `reportedBy.length >= 5`, notify all admins. Return 201. |
| `POST` | `/api/posts/:id/report` | Body: `{ reason }`. Store report in a `Report` collection. Notify moderators of the post's community. Return 201. |
| `POST` | `/api/posts/:id/comments/:cid/report` | Same as post report but targets a comment. Return 201. |
| `PUT` | `/api/admin/users/:id/ban` | Admin only (`requireRole('admin')`). Set `user.banned=true`. Invalidate all refresh tokens for that user. Return updated user. |
| `PUT` | `/api/communities/:id/moderators` | Admin only. Body: `{ userId, action: 'add'\|'remove' }`. Update `user.role` to `'moderator'` or back to `'user'`. Return 200. |

### Leaderboard & Reputation (enhancements)

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/leaderboard` | Query: `?scope=campus\|global&skillId=<id>&limit=50`. Use MongoDB aggregation: `$match` by college if campus scope, `$sort` by xp desc, `$limit`, `$lookup` users. Highlight current user's position even if outside top 50 (separate query). |
| `GET` | `/api/users/me/badges` | Return full badge list with `{ name, description, awardedAt, iconUrl }`. Sort by `awardedAt` desc. |

---

## Socket.IO Group Chat Namespace

Create a new Socket.IO namespace `/group` in `server/sockets/groupHandler.js`. Authentication requirement is the same as the main chat namespace (verify JWT from `handshake.auth.token`).

| Event | Direction | Payload & Behaviour |
|---|---|---|
| `group:join` | Client → Server | `{ groupSessionId }`. Verify user is a GroupMember. `socket.join('group:' + groupSessionId)`. Emit `group:members` to the joining socket with current member list. |
| `group:message` | Client → Server | `{ groupSessionId, body }`. Broadcast to room. Persist to a `GroupMessage` collection. |
| `group:typing` | Client → Server | `{ groupSessionId, isTyping }`. Rebroadcast to room except sender. |
| `group:memberJoined` | Server → Client | Server emits on `POST /join`. Payload: `{ groupSessionId, user: profileSummary, memberCount }`. |
| `group:memberLeft` | Server → Client | Server emits on `DELETE /leave`. Payload: `{ groupSessionId, userId, memberCount }`. |
| `group:sessionCancelled` | Server → Client | Server emits to room when HOST deletes the session. Payload: `{ groupSessionId }`. All clients should navigate away and show a toast. |

---

## Swipe-Based Match UI (Framer Motion)

Replace the Stage 1 card-grid Discover page with a full swipe-based card stack. Implement in `client/src/pages/Discover.tsx`.

### Swipe mechanics

- Render a stack of 3 cards: top card is interactive, bottom two are scaled and offset to show depth.
- Use `@use-gesture/react` `useDrag` hook for drag detection. Framer Motion `animate` prop for spring physics.
- **Threshold:** x-offset > 120px → accept; x-offset < -120px → skip; y-offset < -120px → superlike.
- Animate card flying off screen on decision (`x: ±600` or `y: -800` with rotation). Next card animates up.
- Swipe indicators: a green **Accept** badge fades in when dragging right; a red **Skip** badge when dragging left; a gold star when dragging up.
- On mobile, also support tap-based Accept/Skip/Superlike buttons below the card stack.
- On decision, call `POST /api/matches/:userId/interact`. If `{ matched: true }` returned, show a **You matched!** modal with animation.

### Match detail card (back face)

- Click the info icon on the front face triggers a 180° `rotateY` animation to the back face.
- Back face content: skills alignment table (their teach skills vs. your learn skills, colour-coded), mutual connections count, availability overlap preview (next 3 available slots), badge icons.

---

## WebRTC Video Call UI (Daily.co)

Implement the video call UI in `client/src/pages/VideoCall.tsx`. This page is navigated to from the Session detail page when the session is `CONFIRMED` and within 10 minutes of `scheduledStart`.

- Call `GET /api/sessions/:id/room` to retrieve (or create) the Daily.co room URL before rendering the call.
- Use `@daily-co/daily-react` `DailyProvider` wrapping the component. Use `useParticipants()` and `useLocalParticipant()` hooks.
- **Layout:** Two video tiles side-by-side on desktop, stacked on mobile. Local tile is smaller (picture-in-picture style on mobile).
- **Controls bar (bottom centre):** Toggle camera, toggle mic, share screen, open whiteboard, end call. Each control is a Chakra `IconButton`.
- **Screen sharing:** Call `daily.startScreenShare()`. Show a banner when the other participant is sharing. Remote screen share fills the main tile.
- **Session timer:** Countdown from `scheduledEnd`. Show a warning toast at 5 minutes remaining.
- **In-call chat drawer:** Slides in from the right. Reuses the existing `ChatBox` component for the current match.
- **Whiteboard:** An `<iframe>` embedding tldraw's free hosted version (`https://tldraw.com`). Open in a resizable overlay.
- On call end: navigate to `/sessions/:id/feedback` to prompt post-session rating.
- **In-person mode:** Show a Leaflet map centred on the college's coordinates. Include a **Check In** button that calls `PATCH /api/sessions/:id/checkin`.

---

## Google Calendar Integration

Implement in `server/services/googleCalendarService.js`. Use the `googleapis` npm package with the OAuth2 client.

1. In `server/config/googleOAuth.js`, create an `OAuth2Client` with `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and redirect URI = `SERVER_URL + /api/calendar/google/callback`.
2. In `GET /api/calendar/google/auth`, call `authClient.generateAuthUrl({ access_type: 'offline', scope: ['https://www.googleapis.com/auth/calendar.events'], state: userId, prompt: 'consent' })`.
3. In `GET /api/calendar/google/callback`, call `authClient.getToken(code)`. Encrypt the token object with AES-256-CBC (use `crypto.createCipheriv` with `GOOGLE_TOKEN_SECRET`). Store in `user.googleCalendarTokens`.
4. In `POST /api/calendar/google/sync`, decrypt tokens, call `calendar.events.insert` or `calendar.events.patch` with `extendedProperties.private.skillEXId = session._id.toString()`. Handle token expiry: catch 401, refresh via `authClient.refreshAccessToken()`, update stored tokens.
5. In the client, add a **Sync to Google Calendar** button on the Calendar page. Show a connected status indicator based on whether `user.googleCalendarTokens` is set.

---

## Firebase Push Notifications

Use Firebase Cloud Messaging (FCM) for push notifications. Configure the Firebase Admin SDK in `server/config/firebase.js` using a service account JSON from the `FIREBASE_SERVICE_ACCOUNT` env var (base64-encoded JSON string).

### Notification triggers

| Trigger | Title | Body |
|---|---|---|
| New match created | You have a new match! | `<MatchName>` wants to learn from you. |
| Session confirmed | Session confirmed | Your session with `<n>` on `<date>` is confirmed. |
| Session reminder T-24h | Session tomorrow | You have a session with `<n>` tomorrow at `<time>`. |
| Session reminder T-1h | Session in 1 hour | Your session with `<n>` starts in 1 hour. |
| Session reminder T-10m | Session starting soon | Your session with `<n>` starts in 10 minutes. |
| New message in chat | New message from `<n>` | First 60 chars of message... |
| Group session invitation | You're invited to a group session | `<HostName>` invited you to `<Title>`. |

Use `node-schedule` to schedule reminder jobs when a session is confirmed. Store the job name on the session (`reminderJobs: [String]`) so they can be cancelled if the session is cancelled.

---

## RBAC Middleware Enhancement

Extend `server/middleware/rbac.js` with ownership checks for resource-specific permissions.

```js
// Factory: allow if user owns the resource OR has an elevated role
// Usage: router.put('/:id', verifyToken, requireOwnerOrRole(Session, 'mentorId', 'admin'), handler)
exports.requireOwnerOrRole = (Model, ownerField, ...roles) => async (req, res, next) => {
  const doc = await Model.findById(req.params.id).lean();
  if (!doc) return res.status(404).json({ success: false, error: 'Not found' });
  const isOwner = doc[ownerField]?.toString() === req.user._id.toString();
  const hasRole = roles.includes(req.user.role);
  if (!isOwner && !hasRole) return res.status(403).json({ success: false, error: 'Forbidden' });
  req.doc = doc;  // attach for route handler to reuse
  next();
};

// Middleware to reject banned users before any protected route
exports.rejectBanned = (req, res, next) => {
  if (req.user?.banned) return res.status(403).json({ success: false, error: 'Account suspended' });
  next();
};
```

Apply `rejectBanned` globally after `verifyToken` in `index.js`.

---

## Frontend: New Pages & Components

| Page / Component | Key UI Requirements |
|---|---|
| **Discover Page (rewrite)** | Full swipe card stack as described above. Replace `SimpleGrid` with card stack. Keep the same React Query data fetching logic. |
| **VideoCall Page** | Daily.co video tiles, controls bar, screen share, in-call chat drawer, whiteboard iframe, session timer. Must be responsive: stacked layout on mobile. |
| **Group Sessions Page** | Browse public group sessions. Card grid with filter chips (subject, mode, date). Join button (shows count/capacity). Create Group Session FAB. |
| **Create Group Session Modal** | Chakra Modal with form: title, description, community select, capacity slider, mode toggle, date + time pickers, visibility toggle, resource URL list with add/remove. |
| **Group Session Detail Page** | Header with title, host, capacity, start time. Member avatar stack. Resource links. Group chat section. Join/Leave button. Host controls: edit, cancel, start video call. |
| **Notifications Drawer** | Slides in from top-right. Bell icon in Navbar with unread count badge. Notification items with type icon, message, timestamp, read/unread state. Mark all read button. |
| **Notification Settings Page** | Toggles for push and email. Connect Google Calendar button with OAuth flow. FCM token registration on page load via Firebase SDK. |
| **InPersonMap Component** | Leaflet `MapContainer` centred on college coordinates. Marker at agreed meeting location. Get Directions link to Google Maps. Check In button. |

---

## Slot Overlap Algorithm

Implement in `server/utils/slotOverlap.js`. Used by `GET /api/calendar/overlap/:userId` and the session booking modal.

```js
// Input: two users' availability arrays + existing confirmed sessions
// Output: array of { start: Date, end: Date } windows for the next 14 days
function getOverlappingSlots(userA, userB, confirmedSessions, daysAhead = 14) {
  const windows = [];
  const now = new Date();
  for (let d = 0; d < daysAhead; d++) {
    const date = new Date(now);
    date.setDate(date.getDate() + d);
    const dow = date.getDay();
    const slotsA = userA.availability.filter(s => s.dayOfWeek === dow);
    const slotsB = userB.availability.filter(s => s.dayOfWeek === dow);
    for (const a of slotsA) {
      for (const b of slotsB) {
        const overlapStart = max(toDateTime(date, a.startTime), toDateTime(date, b.startTime));
        const overlapEnd   = min(toDateTime(date, a.endTime),   toDateTime(date, b.endTime));
        if (overlapStart < overlapEnd) {
          const blocked = confirmedSessions.some(s =>
            s.scheduledStart < overlapEnd && s.scheduledEnd > overlapStart &&
            (s.mentorId.toString() === userA._id.toString() || s.learnerId.toString() === userA._id.toString())
          );
          if (!blocked) windows.push({ start: overlapStart, end: overlapEnd });
        }
      }
    }
  }
  return windows;
}
```

---

## Sprint Breakdown & Acceptance Criteria

| Week | Tasks | Done When |
|---|---|---|
| 9 | Framer Motion swipe stack, `@use-gesture` drag events, superlike gesture, match modal animation, swipe indicator overlays | Dragging right >120px triggers accept and card flies off; **You matched!** modal appears on mutual match; mobile tap buttons also work |
| 10 | GroupSession + GroupMember models, all group session CRUD endpoints, capacity enforcement, Socket.IO `/group` namespace, group chat UI | Group session created; joining increments member count; socket message broadcast to room; HOST can delete and all members notified |
| 11 | Daily.co SDK integration, VideoCall page, screen share, in-call chat drawer, session timer, tldraw whiteboard iframe, in-person Leaflet map | Two browsers join the same Daily.co room; screen share shows in the other tile; timer shows correct countdown; check-in endpoint responds 200 |
| 12 | Slot overlap algorithm, Google Calendar OAuth flow, `/api/calendar/google/sync` endpoint, client Calendar page sync button | Overlap algorithm returns correct windows for test availability data; Google Calendar event appears after sync |
| 13 | `requireOwnerOrRole` middleware, `rejectBanned` middleware, report user/post/comment endpoints, ban endpoint, moderator role assignment, reputation-gated community middleware | Banned user receives 403 on any protected route; report count triggers admin notification; moderator can delete posts in their community |
| 14 | Firebase Admin SDK, FCM push notifications, all 7 notification triggers, Notifications Drawer UI, Notification Settings page, leaderboard aggregation query, integration test suite | Push notification received on mobile browser for new match; leaderboard returns correct campus-scoped ranking; all Stage 2 API tests pass |

---

## Backward Compatibility Checklist

Verify the following Stage 1 features still work correctly after Stage 2 changes:

1. `POST /api/auth/register` and `POST /api/auth/login` — user creation and JWT flow unchanged.
2. `GET /api/matches/suggestions` — filter-based matching still returns results (swipe UI is a frontend-only change).
3. Socket.IO main namespace — 1:1 messaging unaffected by the new `/group` namespace.
4. Session booking flow — existing `PROPOSED` and `CONFIRMED` sessions not broken by new `dailyRoomUrl` field.
5. Community post and comment CRUD — existing upvote logic unchanged.
6. XP and badge awards — `xpService.js` still awards XP correctly for all Stage 1 triggers.
