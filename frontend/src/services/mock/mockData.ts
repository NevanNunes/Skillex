// In-memory mock backend used when VITE_API_BASE_URL is not set.
// Implements just enough endpoints to make every page feel real.

import type {
  AppNotification,
  AvailabilitySlot,
  Badge,
  ChatMessage,
  ChatRoom,
  Comment,
  Community,
  GamificationProfile,
  IntegrationStatus,
  LeaderboardEntry,
  LearnSkill,
  Match,
  OverlapWindow,
  Paginated,
  Post,
  Review,
  Skill,
  SkillSession,
  TeachSkill,
  User,
  XpEvent,
} from "@/types/api";

const now = () => new Date().toISOString();
const inHours = (h: number) => new Date(Date.now() + h * 3600_000).toISOString();
const ago = (h: number) => new Date(Date.now() - h * 3600_000).toISOString();

let nextId = 1000;
const id = () => ++nextId;

const me: User = {
  id: 1,
  username: "alex.kim",
  email: "alex@uni.edu",
  first_name: "Alex",
  last_name: "Kim",
  full_name: "Alex Kim",
  avatar_url: null,
  bio: "CS junior. Loves rust and rock climbing. Trading guitar lessons for calc help.",
  university: "Northstate University",
  campus: "Main Campus",
  timezone: "Europe/Berlin",
  reputation: 4.8,
  level: 7,
  xp: 1420,
  badges_count: 6,
  joined_at: ago(24 * 90),
};

const peers: User[] = [
  { id: 2, username: "mira.wong", email: "mira@uni.edu", full_name: "Mira Wong", first_name: "Mira", last_name: "Wong", university: "Northstate University", reputation: 4.9, level: 9, xp: 2210, bio: "PhD in linguistics. Tutors French, Mandarin & academic writing." },
  { id: 3, username: "diego.r", email: "diego@uni.edu", full_name: "Diego Ramos", first_name: "Diego", last_name: "Ramos", university: "Northstate University", reputation: 4.6, level: 5, xp: 760, bio: "Mechanical engineering. CAD wizard. Wants to learn React." },
  { id: 4, username: "sana.j", email: "sana@uni.edu", full_name: "Sana Joshi", first_name: "Sana", last_name: "Joshi", university: "Northstate University", reputation: 4.7, level: 8, xp: 1880, bio: "Data viz + d3.js. Learning piano." },
  { id: 5, username: "leo.m", email: "leo@uni.edu", full_name: "Leo Martin", first_name: "Leo", last_name: "Martin", university: "Northstate University", reputation: 4.4, level: 4, xp: 540, bio: "Photographer. Wants to learn statistics." },
  { id: 6, username: "noor.s", email: "noor@uni.edu", full_name: "Noor Saleh", first_name: "Noor", last_name: "Saleh", university: "Northstate University", reputation: 4.95, level: 11, xp: 3120, bio: "Senior in pure math. Patient tutor for proofs and topology." },
];

const skills: Skill[] = [
  { id: 1, name: "Calculus", category: "Math" },
  { id: 2, name: "Linear Algebra", category: "Math" },
  { id: 3, name: "React", category: "Programming" },
  { id: 4, name: "Rust", category: "Programming" },
  { id: 5, name: "Guitar", category: "Music" },
  { id: 6, name: "Piano", category: "Music" },
  { id: 7, name: "French", category: "Language" },
  { id: 8, name: "Mandarin", category: "Language" },
  { id: 9, name: "Photography", category: "Arts" },
  { id: 10, name: "Statistics", category: "Math" },
  { id: 11, name: "CAD", category: "Engineering" },
  { id: 12, name: "Academic Writing", category: "Language" },
];

let teachSkills: TeachSkill[] = [
  { id: id(), skill: skills[4], level: "advanced", description: "10+ years. Fingerstyle and chords." },
  { id: id(), skill: skills[2], level: "intermediate", description: "Hooks, context, suspense." },
];
let learnSkills: LearnSkill[] = [
  { id: id(), skill: skills[0], goal: "Pass MATH 201", priority: "high" },
  { id: id(), skill: skills[3], goal: "Build a CLI tool", priority: "med" },
];

let availability: AvailabilitySlot[] = [
  { weekday: 1, start: "16:00", end: "18:00" },
  { weekday: 3, start: "10:00", end: "12:00" },
  { weekday: 5, start: "14:00", end: "17:00" },
];

let matches: Match[] = peers.map((u, i) => ({
  id: 100 + i,
  user: u,
  score: 0.95 - i * 0.07,
  shared_skills: i % 2 === 0 ? ["Calculus", "React"] : ["French", "Piano"],
  status: "pending",
  created_at: ago(i + 1),
  type: "rule",
}));

let sessions: SkillSession[] = [
  { id: id(), teacher: peers[0], learner: me, skill: skills[6], start: inHours(20), end: inHours(21), status: "confirmed", created_at: ago(48), meeting_url: null },
  { id: id(), teacher: me, learner: peers[1], skill: skills[2], start: inHours(48), end: inHours(49), status: "pending", created_at: ago(12), meeting_url: null },
  { id: id(), teacher: peers[5], learner: me, skill: skills[0], start: ago(72), end: ago(71), status: "completed", created_at: ago(120), meeting_url: null },
  { id: id(), teacher: me, learner: peers[3], skill: skills[4], start: ago(200), end: ago(199), status: "cancelled", created_at: ago(220), meeting_url: null },
];

const reviews: Review[] = [
  { id: id(), reviewer: peers[1], rating: 5, comment: "Patient and clear. Helped me ship my first React project!", session_id: 0, created_at: ago(40) },
  { id: id(), reviewer: peers[2], rating: 5, comment: "Best guitar tutor I've had.", session_id: 0, created_at: ago(80) },
];

const rooms: ChatRoom[] = peers.slice(0, 4).map((p, i) => ({
  id: 200 + i,
  participants: [me, p],
  unread_count: i === 0 ? 2 : 0,
  updated_at: ago(i + 1),
  last_message: { id: id(), room_id: 200 + i, sender: p, body: i === 0 ? "See you at 4pm!" : "Thanks for the session.", created_at: ago(i + 1) },
}));

const messagesByRoom: Record<number, ChatMessage[]> = {};
rooms.forEach((r) => {
  const other = r.participants.find((p) => p.id !== me.id)!;
  messagesByRoom[r.id] = [
    { id: id(), room_id: r.id, sender: other, body: "Hey! Ready for our session?", created_at: ago(3) },
    { id: id(), room_id: r.id, sender: me, body: "Yes — joining now.", created_at: ago(2.9) },
    { id: id(), room_id: r.id, sender: other, body: r.last_message?.body ?? "👍", created_at: ago(2.5) },
  ];
});

const communities: Community[] = [
  { id: 1, name: "CS Study Group", slug: "cs-study", description: "Algorithms, systems, internships.", members_count: 482, is_member: true, cover_color: "184 78% 38%" },
  { id: 2, name: "Language Exchange", slug: "lang-x", description: "Conversation partners across 12 languages.", members_count: 311, is_member: false, cover_color: "210 95% 56%" },
  { id: 3, name: "Music Practice Pals", slug: "music", description: "Daily accountability and feedback.", members_count: 189, is_member: true, cover_color: "168 76% 50%" },
  { id: 4, name: "Math Help", slug: "math", description: "Office hours every Tue & Thu.", members_count: 624, is_member: false, cover_color: "38 95% 55%" },
];

let posts: Post[] = [
  { id: 1, community_id: 1, community_name: "CS Study Group", author: peers[0], title: "Best resource for learning systems programming?", body: "I've done CS intro and a bit of C. Where to go next?", type: "question", score: 24, user_vote: 0, comments_count: 3, accepted_comment_id: null, created_at: ago(6) },
  { id: 2, community_id: 1, community_name: "CS Study Group", author: peers[2], title: "We hit 500 members 🎉", body: "Thanks everyone for making this community awesome.", type: "discussion", score: 41, user_vote: 1, comments_count: 7, created_at: ago(20) },
  { id: 3, community_id: 3, community_name: "Music Practice Pals", author: peers[1], title: "Daily practice thread — Apr 22", body: "Drop what you practiced today!", type: "discussion", score: 12, user_vote: 0, comments_count: 12, created_at: ago(2) },
];

const commentsByPost: Record<number, Comment[]> = {
  1: [
    { id: id(), post_id: 1, author: peers[5], body: "Start with 'Computer Systems: A Programmer's Perspective'.", score: 9, user_vote: 0, parent_id: null, is_accepted: false, created_at: ago(5) },
    { id: id(), post_id: 1, author: peers[3], body: "+1 to CSAPP. Pair it with nand2tetris.", score: 5, user_vote: 0, parent_id: null, created_at: ago(4) },
  ],
  2: [],
  3: [],
};

const badges: Badge[] = [
  { id: 1, code: "first_session", name: "First Session", description: "Completed your first session.", earned_at: ago(72) },
  { id: 2, code: "five_star", name: "Five Star", description: "Received a 5-star review.", earned_at: ago(60) },
  { id: 3, code: "streak_7", name: "7-day Streak", description: "Active 7 days in a row.", earned_at: ago(24) },
  { id: 4, code: "polyglot", name: "Polyglot", description: "Taught 3 different skills.", earned_at: ago(12) },
  { id: 5, code: "mentor", name: "Mentor", description: "Helped 10 learners.", earned_at: ago(6) },
  { id: 6, code: "early_bird", name: "Early Bird", description: "Joined in the first month.", earned_at: ago(2160) },
];

const xpHistory: XpEvent[] = [
  { id: id(), delta: 50, reason: "Completed session: Calculus with Noor", created_at: ago(70) },
  { id: id(), delta: 30, reason: "Received 5-star review", created_at: ago(60) },
  { id: id(), delta: 20, reason: "Helpful answer accepted", created_at: ago(40) },
  { id: id(), delta: 100, reason: "Badge unlocked: Mentor", created_at: ago(6) },
];

const leaderboard: LeaderboardEntry[] = [...peers, me]
  .sort((a, b) => (b.xp ?? 0) - (a.xp ?? 0))
  .map((u, i) => ({ rank: i + 1, user: u, xp: u.xp ?? 0, level: u.level ?? 1, is_me: u.id === me.id }));

let notifications: AppNotification[] = [
  { id: id(), type: "match", title: "New match: Noor Saleh", body: "98% compatibility on Calculus.", read: false, link: "/app/matching", created_at: ago(1) },
  { id: id(), type: "session", title: "Session confirmed", body: "Piano with Mira tomorrow at 4 PM.", read: false, link: "/app/sessions", created_at: ago(3) },
  { id: id(), type: "message", title: "New message", body: "Mira: See you at 4pm!", read: false, link: "/app/chat", created_at: ago(2) },
  { id: id(), type: "badge", title: "Badge unlocked: Mentor", body: "+100 XP", read: true, link: "/app/gamification", created_at: ago(6) },
];

const integration: IntegrationStatus = { connected: false };

// --- Router

interface Req {
  method: string;
  url: string;
  data?: unknown;
  params?: Record<string, string | number | undefined>;
}

function paginate<T>(items: T[], page = 1, pageSize = 20): Paginated<T> {
  const start = (page - 1) * pageSize;
  return {
    count: items.length,
    next: start + pageSize < items.length ? `?page=${page + 1}` : null,
    previous: page > 1 ? `?page=${page - 1}` : null,
    results: items.slice(start, start + pageSize),
  };
}

function match(re: RegExp, p: string) {
  return re.exec(p);
}

const wait = (ms = 220) => new Promise((r) => setTimeout(r, ms));

function buildOverlapWindows(): OverlapWindow[] {
  // next 7 days, generate 3 plausible windows
  return [0, 1, 3].map((d) => {
    const start = new Date();
    start.setDate(start.getDate() + d + 1);
    start.setHours(16, 0, 0, 0);
    const end = new Date(start);
    end.setHours(18, 0, 0, 0);
    return {
      start: start.toISOString(),
      end: end.toISOString(),
      date: start.toISOString().slice(0, 10),
      day: start.toLocaleDateString("en-US", { weekday: "long" }),
      mode: "online",
      duration_minutes: 120,
    };
  });
}

export async function handleMockRequest(req: Req): Promise<{ status: number; data: unknown }> {
  await wait();
  const path = req.url.replace(/^https?:\/\/[^/]+/, "").split("?")[0];
  const m = req.method.toUpperCase();

  // Auth
  if (path === "/api/auth/login/" && m === "POST") {
    return { status: 200, data: { access: "mock.access", refresh: "mock.refresh", user: me } };
  }
  if (path === "/api/auth/register/" && m === "POST") {
    return { status: 201, data: { access: "mock.access", refresh: "mock.refresh", user: me } };
  }
  if (path === "/api/auth/refresh/" && m === "POST") {
    return { status: 200, data: { access: "mock.access2", refresh: "mock.refresh" } };
  }
  if (path === "/api/auth/logout/" && m === "POST") return { status: 204, data: null };

  // Users
  if (path === "/api/users/me/" && m === "GET") return { status: 200, data: me };
  if (path === "/api/users/me/" && m === "PUT") {
    Object.assign(me, req.data as Partial<User>);
    return { status: 200, data: me };
  }
  if (path === "/api/users/me/availability/" && m === "GET")
    return { status: 200, data: availability };
  if (path === "/api/users/me/availability/" && m === "PUT") {
    availability = (req.data as { slots: AvailabilitySlot[] }).slots ?? [];
    return { status: 200, data: availability };
  }
  if (path === "/api/users/" && m === "GET") {
    const q = (req.params?.search as string | undefined)?.toLowerCase().trim();
    const pageSize = Number(req.params?.page_size ?? 8);
    const list = [me, ...peers].filter((u) => {
      if (u.id === me.id) return false;
      if (!q) return true;
      const haystack = [u.username, u.first_name, u.last_name, u.college, u.bio]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
    return { status: 200, data: paginate(list, 1, pageSize) };
  }
  let mm = match(/^\/api\/users\/([^/]+)\/$/, path);
  if (mm && m === "GET") {
    const u = [me, ...peers].find((x) => x.username === mm![1]) ?? me;
    return { status: 200, data: u };
  }
  mm = match(/^\/api\/calendar\/overlap\/(\d+)\/$/, path);
  if (mm && m === "GET") return { status: 200, data: buildOverlapWindows() };

  // Skills
  if (path === "/api/skills/" && m === "GET") {
    const q = (req.params?.search as string | undefined)?.toLowerCase();
    const list = q ? skills.filter((s) => s.name.toLowerCase().includes(q)) : skills;
    return { status: 200, data: list };
  }
  if (path === "/api/skills/teach/" && m === "GET") return { status: 200, data: teachSkills };
  if (path === "/api/skills/teach/" && m === "POST") {
    const body = req.data as Partial<TeachSkill> & { skill_id: number };
    const skill = skills.find((s) => s.id === body.skill_id) ?? skills[0];
    const t: TeachSkill = { id: id(), skill, level: body.level ?? "intermediate", description: body.description };
    teachSkills.push(t);
    return { status: 201, data: t };
  }
  mm = match(/^\/api\/skills\/teach\/(\d+)\/$/, path);
  if (mm && m === "DELETE") {
    teachSkills = teachSkills.filter((t) => t.id !== Number(mm![1]));
    return { status: 204, data: null };
  }
  if (path === "/api/skills/learn/" && m === "GET") return { status: 200, data: learnSkills };
  if (path === "/api/skills/learn/" && m === "POST") {
    const body = req.data as Partial<LearnSkill> & { skill_id: number };
    const skill = skills.find((s) => s.id === body.skill_id) ?? skills[0];
    const t: LearnSkill = { id: id(), skill, goal: body.goal, priority: body.priority };
    learnSkills.push(t);
    return { status: 201, data: t };
  }
  mm = match(/^\/api\/skills\/learn\/(\d+)\/$/, path);
  if (mm && m === "DELETE") {
    learnSkills = learnSkills.filter((t) => t.id !== Number(mm![1]));
    return { status: 204, data: null };
  }

  // Matching
  if (path === "/api/matches/" && m === "GET") {
    return { status: 200, data: paginate(matches.filter((x) => x.type !== "semantic")) };
  }
  if (path === "/api/matches/accepted/" && m === "GET") {
    return { status: 200, data: paginate(matches.filter((x) => x.status === "accepted")) };
  }
  if (path === "/api/matches/semantic/" && m === "GET") {
    const threshold = Number(req.params?.threshold ?? 0.7);
    const list = matches
      .map((x, i) => ({ ...x, id: 500 + i, type: "semantic" as const, score: Math.max(0.55, x.score - 0.05), semantic_threshold: threshold }))
      .filter((x) => x.score >= threshold);
    return { status: 200, data: paginate(list) };
  }
  mm = match(/^\/api\/matches\/(\d+)\/(accept|reject)\/$/, path);
  if (mm && m === "POST") {
    const idNum = Number(mm[1]);
    const action = mm[2] as "accept" | "reject";
    matches = matches.map((x) => (x.id === idNum ? { ...x, status: action === "accept" ? "accepted" : "rejected" } : x));
    return { status: 200, data: matches.find((x) => x.id === idNum) };
  }
  if (path === "/api/matches/refresh/" && m === "POST") return { status: 200, data: { refreshed: true } };
  if (path === "/api/matches/index-profile/" && m === "POST") return { status: 200, data: { indexed: true } };

  // Sessions
  if (path === "/api/sessions/" && m === "GET") {
    const status = req.params?.status as string | undefined;
    const list = status ? sessions.filter((s) => s.status === status) : sessions;
    return { status: 200, data: paginate(list) };
  }
  if (path === "/api/sessions/book/" && m === "POST") {
    const body = req.data as { teacher_id: number; skill_id: number; start: string; end: string };
    const teacher = peers.find((p) => p.id === body.teacher_id) ?? peers[0];
    const skill = skills.find((s) => s.id === body.skill_id) ?? skills[0];
    const s: SkillSession = {
      id: id(), teacher, learner: me, skill, start: body.start, end: body.end, status: "pending",
      meeting_url: null, created_at: now(),
    };
    sessions.unshift(s);
    return { status: 201, data: s };
  }
  mm = match(/^\/api\/sessions\/(\d+)\/(confirm|cancel|complete)\/$/, path);
  if (mm && m === "POST") {
    const sid = Number(mm[1]);
    const action = mm[2];
    sessions = sessions.map((s) =>
      s.id === sid
        ? {
            ...s,
            status:
              action === "confirm" ? "confirmed" : action === "cancel" ? "cancelled" : "completed",
            meeting_url: action === "confirm" ? "https://daily.co/skillex-mock" : s.meeting_url,
          }
        : s,
    );
    return { status: 200, data: sessions.find((s) => s.id === sid) };
  }
  mm = match(/^\/api\/sessions\/(\d+)\/feedback\/$/, path);
  if (mm && m === "POST") return { status: 201, data: { ok: true } };

  // Reviews
  if (path === "/api/reviews/" && m === "POST") {
    const r = { id: id(), ...((req.data as Record<string, unknown>) ?? {}), reviewer: me, created_at: now() } as Review;
    reviews.unshift(r);
    return { status: 201, data: r };
  }
  mm = match(/^\/api\/reviews\/user\/([^/]+)\/$/, path);
  if (mm && m === "GET") return { status: 200, data: paginate(reviews) };

  // Chat REST
  if (path === "/api/chat/rooms/" && m === "GET") return { status: 200, data: paginate(rooms) };
  mm = match(/^\/api\/chat\/rooms\/(\d+)\/messages\/$/, path);
  if (mm && m === "GET") return { status: 200, data: paginate(messagesByRoom[Number(mm[1])] ?? []) };
  mm = match(/^\/api\/chat\/rooms\/(\d+)\/send\/$/, path);
  if (mm && m === "POST") {
    const rid = Number(mm[1]);
    const body = (req.data as { body: string }).body;
    const msg: ChatMessage = { id: id(), room_id: rid, sender: me, body, created_at: now() };
    messagesByRoom[rid] = [...(messagesByRoom[rid] ?? []), msg];
    const room = rooms.find((r) => r.id === rid);
    if (room) { room.last_message = msg; room.updated_at = msg.created_at; }
    return { status: 201, data: msg };
  }
  mm = match(/^\/api\/chat\/rooms\/(\d+)\/read\/$/, path);
  if (mm && m === "POST") {
    const rid = Number(mm[1]);
    const room = rooms.find((r) => r.id === rid);
    if (room) room.unread_count = 0;
    return { status: 200, data: { ok: true } };
  }

  // Community
  if (path === "/api/communities/" && m === "GET") return { status: 200, data: paginate(communities) };
  if (path === "/api/communities/" && m === "POST") {
    const body = req.data as Partial<Community>;
    const c: Community = {
      id: id(), name: body.name ?? "New community", slug: (body.name ?? "new").toLowerCase().replace(/\s+/g, "-"),
      description: body.description ?? "", members_count: 1, is_member: true, cover_color: "184 78% 38%",
    };
    communities.unshift(c);
    return { status: 201, data: c };
  }
  mm = match(/^\/api\/communities\/(\d+)\/$/, path);
  if (mm && m === "GET") {
    const c = communities.find((x) => x.id === Number(mm![1]));
    return c ? { status: 200, data: c } : { status: 404, data: { detail: "Not found" } };
  }
  mm = match(/^\/api\/communities\/(\d+)\/(join|leave)\/$/, path);
  if (mm) {
    const cid = Number(mm[1]); const join = mm[2] === "join";
    const c = communities.find((x) => x.id === cid);
    if (c) { c.is_member = join; c.members_count += join ? 1 : -1; }
    return { status: 200, data: c };
  }
  mm = match(/^\/api\/communities\/(\d+)\/posts\/$/, path);
  if (mm && m === "GET") {
    const cid = Number(mm[1]);
    const sort = (req.params?.sort as string) ?? "new";
    let list = posts.filter((p) => p.community_id === cid);
    if (sort === "top") list = [...list].sort((a, b) => b.score - a.score);
    else if (sort === "hot") list = [...list].sort((a, b) => b.comments_count - a.comments_count);
    else list = [...list].sort((a, b) => b.created_at.localeCompare(a.created_at));
    return { status: 200, data: paginate(list) };
  }
  mm = match(/^\/api\/communities\/(\d+)\/posts\/create\/$/, path);
  if (mm && m === "POST") {
    const cid = Number(mm[1]);
    const body = req.data as Partial<Post>;
    const p: Post = {
      id: id(), community_id: cid, community_name: communities.find((c) => c.id === cid)?.name,
      author: me, title: body.title ?? "Untitled", body: body.body ?? "", type: body.type ?? "discussion",
      score: 1, user_vote: 1, comments_count: 0, accepted_comment_id: null, created_at: now(),
    };
    posts.unshift(p);
    return { status: 201, data: p };
  }
  mm = match(/^\/api\/posts\/(\d+)\/$/, path);
  if (mm && m === "GET") {
    const p = posts.find((x) => x.id === Number(mm![1]));
    return p ? { status: 200, data: p } : { status: 404, data: { detail: "Not found" } };
  }
  mm = match(/^\/api\/posts\/(\d+)\/vote\/$/, path);
  if (mm && m === "POST") {
    const pid = Number(mm[1]);
    const dir = (req.data as { value: -1 | 0 | 1 }).value;
    const p = posts.find((x) => x.id === pid);
    if (p) { p.score = p.score - (p.user_vote ?? 0) + dir; p.user_vote = dir; }
    return { status: 200, data: p };
  }
  mm = match(/^\/api\/posts\/(\d+)\/accept\/(\d+)\/$/, path);
  if (mm && m === "PUT") {
    const pid = Number(mm[1]); const cid = Number(mm[2]);
    const p = posts.find((x) => x.id === pid);
    if (p) p.accepted_comment_id = cid;
    (commentsByPost[pid] ?? []).forEach((c) => (c.is_accepted = c.id === cid));
    return { status: 200, data: p };
  }
  mm = match(/^\/api\/posts\/(\d+)\/comments\/$/, path);
  if (mm && m === "GET") return { status: 200, data: paginate(commentsByPost[Number(mm[1])] ?? []) };
  mm = match(/^\/api\/posts\/(\d+)\/comments\/create\/$/, path);
  if (mm && m === "POST") {
    const pid = Number(mm[1]);
    const body = req.data as Partial<Comment>;
    const c: Comment = {
      id: id(), post_id: pid, author: me, body: body.body ?? "", score: 1, user_vote: 1,
      parent_id: body.parent_id ?? null, created_at: now(),
    };
    commentsByPost[pid] = [...(commentsByPost[pid] ?? []), c];
    const p = posts.find((x) => x.id === pid); if (p) p.comments_count++;
    return { status: 201, data: c };
  }
  mm = match(/^\/api\/posts\/(\d+)\/comments\/(\d+)\/vote\/$/, path);
  if (mm && m === "POST") {
    const pid = Number(mm[1]); const cid = Number(mm[2]);
    const dir = (req.data as { value: -1 | 0 | 1 }).value;
    const c = (commentsByPost[pid] ?? []).find((x) => x.id === cid);
    if (c) { c.score = c.score - (c.user_vote ?? 0) + dir; c.user_vote = dir; }
    return { status: 200, data: c };
  }

  // Gamification
  if (path === "/api/gamification/me/" && m === "GET") {
    const data: GamificationProfile = {
      user: me, xp: me.xp ?? 0, level: me.level ?? 1, next_level_xp: 1800, reputation: me.reputation ?? 0, badges,
    };
    return { status: 200, data };
  }
  if (path === "/api/gamification/xp-history/" && m === "GET") return { status: 200, data: paginate(xpHistory) };
  if (path === "/api/gamification/badges/" && m === "GET") return { status: 200, data: badges };
  if (path === "/api/gamification/leaderboard/" && m === "GET") return { status: 200, data: leaderboard };

  // Notifications
  if (path === "/api/notifications/" && m === "GET") {
    const filter = req.params?.read as string | undefined;
    let list = notifications;
    if (filter === "false") list = notifications.filter((n) => !n.read);
    return { status: 200, data: paginate(list) };
  }
  if (path === "/api/notifications/unread-count/" && m === "GET")
    return { status: 200, data: { count: notifications.filter((n) => !n.read).length } };
  mm = match(/^\/api\/notifications\/(\d+)\/read\/$/, path);
  if (mm && m === "PUT") {
    const nid = Number(mm[1]);
    notifications = notifications.map((n) => (n.id === nid ? { ...n, read: true } : n));
    return { status: 200, data: notifications.find((n) => n.id === nid) };
  }
  if (path === "/api/notifications/read-all/" && m === "PUT") {
    notifications = notifications.map((n) => ({ ...n, read: true }));
    return { status: 200, data: { ok: true } };
  }

  // Integrations
  if (path === "/api/integrations/google/connect/" && m === "GET")
    return { status: 200, data: { url: "https://accounts.google.com/o/oauth2/v2/auth?mock=1" } };
  if (path === "/api/integrations/google/status/" && m === "GET") return { status: 200, data: integration };
  mm = match(/^\/api\/integrations\/google\/sync\/(\d+)\/$/, path);
  if (mm && m === "POST") return { status: 200, data: { synced: true } };
  mm = match(/^\/api\/integrations\/daily\/(room|token)\/(\d+)\/$/, path);
  if (mm && m === "POST")
    return {
      status: 200,
      data: mm[1] === "room"
        ? { room_name: `session-${mm[2]}`, meeting_url: "https://daily.co/skillex-mock", detail: "Room created" }
        : { token: "mock-token", meeting_url: "https://daily.co/skillex-mock", room_name: `session-${mm[2]}` },
    };

  return { status: 404, data: { detail: `Mock route not found: ${m} ${path}` } };
}
