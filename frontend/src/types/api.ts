// Domain types — aligned exactly to Django REST backend serializers.

export interface Paginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface ApiFieldErrors {
  [field: string]: string[] | string;
}

export interface ApiError {
  detail?: string;
  message?: string;
  status?: number;
  fieldErrors?: ApiFieldErrors;
}

export interface AuthTokens {
  access: string;
  refresh: string;
}

// ── Users ──────────────────────────────────────
// Matches UserProfileSerializer / PublicProfileSerializer
export interface User {
  id: string; // UUID
  username: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  bio?: string;
  avatar?: string | null; // Cloudinary URL or null
  timezone?: string;
  college?: string;
  year?: number;
  branch?: string;
  reputation_score?: number;
  is_verified?: boolean;
  xp?: number;
  teacher_level?: number;
  learner_level?: number;
  role?: string;
  date_joined?: string;
  availability?: AvailabilitySlot[];
}

// Matches AvailabilitySlotSerializer
export interface AvailabilitySlot {
  id?: string;
  day_of_week: number; // 0-6
  start_time: string; // "HH:mm:ss"
  end_time: string;
  mode?: string;
}

// ── Skills ─────────────────────────────────────
// Matches SkillCategorySerializer
export interface SkillCategory {
  id: number;
  name: string;
  slug: string;
}

// Matches SkillSerializer
export interface Skill {
  id: string; // UUID
  name: string;
  slug: string;
  category: SkillCategory;
}

// Matches UserSkillTeachSerializer
export interface TeachSkill {
  id: string;
  skill: Skill;
  skill_id?: string; // write-only
  proficiency_level: "beginner" | "intermediate" | "expert";
  description?: string;
  hourly_rate?: number;
  is_active?: boolean;
  evidence?: SkillEvidence[];
}

export interface SkillEvidence {
  id: string;
  title: string;
  file: string;
  uploaded_at: string;
}

// Matches UserSkillLearnSerializer
export interface LearnSkill {
  id: string;
  skill: Skill;
  skill_id?: string; // write-only
  current_level: "beginner" | "intermediate" | "expert";
}

// ── Matching ───────────────────────────────────
export type MatchStatus = "pending" | "accepted" | "rejected";

// Matches MatchSerializer
export interface Match {
  id: string; // UUID
  teacher: User; // PublicProfileSerializer
  learner?: User;
  teach_skill: TeachSkill; // UserSkillTeachSerializer
  score: number;
  status: MatchStatus;
  teacher_accepted?: boolean;
  learner_accepted?: boolean;
  counterpart?: User;
  accepted_by_me?: boolean;
  waiting_for_other?: boolean;
  created_at: string;
}

// ── Sessions ───────────────────────────────────
export type SessionStatus = "pending" | "confirmed" | "completed" | "cancelled";

// Matches SessionSerializer
export interface SkillSession {
  id: string; // UUID
  match: string; // UUID FK
  teacher: string; // UUID FK
  learner: string; // UUID FK
  scheduled_at: string;
  duration_minutes: number;
  status: SessionStatus;
  meeting_url?: string | null;
  created_at: string;
}

// ── Reviews ────────────────────────────────────
// Matches ReviewSerializer
export interface Review {
  id: string;
  session: string; // UUID FK
  reviewer: string; // UUID FK
  reviewee: string; // UUID FK
  rating: number;
  comment: string;
  created_at: string;
}

// ── Chat ───────────────────────────────────────
// Matches ChatRoomSerializer
export interface ChatRoom {
  id: string; // UUID
  teacher?: string; // UUID FK
  learner?: string; // UUID FK
  match?: string; // legacy field (optional)
  participant?: {
    id: string;
    username: string;
    avatar?: string | null;
  };
  last_message?: ChatMessage | null;
  unread_count: number;
  created_at: string;
}

// Matches MessageSerializer
export interface ChatMessage {
  id: string;
  sender: string; // UUID FK
  sender_username: string;
  content: string;
  is_read: boolean;
  created_at: string;
}

// ── Community ──────────────────────────────────
// Matches CommunitySerializer
export interface Community {
  id: string;
  name: string;
  slug: string;
  description: string;
  skill?: string | null;
  created_by: string;
  member_count: number;
  post_count: number;
  is_member: boolean;
  created_at: string;
}

export type PostType = "discussion" | "question" | "resource" | "poll";
export type PostSort = "new" | "top" | "hot";

// Matches AuthorMiniSerializer
export interface AuthorMini {
  id: string;
  username: string;
  avatar?: string | null;
}

// Matches PostSerializer
export interface Post {
  id: string;
  community: string; // UUID FK
  author: AuthorMini;
  title: string;
  body: string;
  post_type: PostType;
  tags: string[];
  upvotes: number;
  downvotes: number;
  net_votes: number;
  comment_count: number;
  accepted_comment?: string | null;
  is_pinned: boolean;
  user_vote: "upvote" | "downvote" | null;
  created_at: string;
  updated_at: string;
}

// Matches CommentSerializer
export interface Comment {
  id: string;
  post: string; // UUID FK
  author: AuthorMini;
  body: string;
  parent_comment?: string | null;
  upvotes: number;
  downvotes: number;
  net_votes: number;
  replies: Comment[];
  created_at: string;
  updated_at: string;
}

// ── Gamification ───────────────────────────────
// Matches BadgeSerializer (inside UserBadgeSerializer)
export interface Badge {
  id: string;
  name: string;
  description: string;
  icon?: string;
  criteria_action: string;
  criteria_count: number;
}

export interface UserBadge {
  id: string;
  badge: Badge;
  awarded_at: string;
}

// Matches XPTransactionSerializer
export interface XpEvent {
  id: string;
  action: string;
  xp_amount: number;
  reference_id?: string | null;
  created_at: string;
}

// Matches GamificationSummarySerializer (from get_user_gamification_summary)
export interface GamificationProfile {
  xp: number;
  teacher_level: number;
  learner_level: number;
  badges: GamificationBadge[];
}

// Shape from get_user_gamification_summary .values()
export interface GamificationBadge {
  badge__name: string;
  badge__description: string;
  badge__icon: string;
  awarded_at: string;
}

// Matches LeaderboardView response
export interface LeaderboardResponse {
  leaderboard: LeaderboardEntry[];
  current_user_rank: number | null;
}

export interface LeaderboardEntry {
  rank: number;
  user: {
    id: string;
    username: string;
    avatar: string | null;
    reputation_score: number;
  };
  xp: number;
  level: number;
}

// ── Notifications ──────────────────────────────
export type NotificationType =
  | "new_match"
  | "session_confirmed"
  | "session_reminder"
  | "session_cancelled"
  | "session_completed"
  | "new_message"
  | "post_reply"
  | "answer_accepted"
  | "badge_earned"
  | "level_up"
  | "community_invite"
  | "report_action"
  | "system";

// Matches NotificationSerializer
export interface AppNotification {
  id: string;
  notification_type: NotificationType;
  title: string;
  message: string;
  payload?: Record<string, unknown>;
  channel?: string;
  is_read: boolean;
  read_at?: string | null;
  created_at: string;
}

// ── Integrations ───────────────────────────────
export interface IntegrationStatus {
  connected: boolean;
  expires_at?: string;
}

// ── Overlap ────────────────────────────────────
export interface OverlapResponse {
  user_a: string;
  user_b: string;
  days_ahead: number;
  overlap_count: number;
  windows: OverlapWindow[];
}

export interface OverlapWindow {
  date: string;
  start: string;
  end: string;
}
