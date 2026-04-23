// Domain types shared across services.

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

export interface User {
  id: number;
  username: string;
  email: string;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  avatar_url?: string | null;
  bio?: string;
  university?: string;
  campus?: string;
  timezone?: string;
  reputation?: number;
  level?: number;
  xp?: number;
  badges_count?: number;
  joined_at?: string;
}

export interface Skill {
  id: number;
  name: string;
  slug?: string;
  category?: string;
}

export interface TeachSkill {
  id: number;
  skill: Skill;
  level: "beginner" | "intermediate" | "advanced" | "expert";
  description?: string;
}

export interface LearnSkill {
  id: number;
  skill: Skill;
  goal?: string;
  priority?: "low" | "med" | "high";
}

export interface AvailabilitySlot {
  weekday: number; // 0-6 (Mon-Sun)
  start: string; // "HH:mm"
  end: string;
}

export interface OverlapWindow {
  start: string; // ISO
  end: string; // ISO
}

export type MatchStatus = "pending" | "accepted" | "rejected";

export interface Match {
  id: number;
  user: User;
  score: number;
  shared_skills: string[];
  status: MatchStatus;
  created_at: string;
  type?: "rule" | "semantic";
  semantic_threshold?: number;
}

export type SessionStatus = "pending" | "confirmed" | "completed" | "cancelled";

export interface SkillSession {
  id: number;
  teacher: User;
  learner: User;
  skill: Skill;
  start: string;
  end: string;
  status: SessionStatus;
  meeting_url?: string | null;
  notes?: string;
  created_at: string;
}

export interface Review {
  id: number;
  reviewer: User;
  rating: number; // 1-5
  comment: string;
  session_id: number;
  created_at: string;
}

export interface ChatRoom {
  id: number;
  name?: string;
  participants: User[];
  last_message?: ChatMessage | null;
  unread_count: number;
  updated_at: string;
}

export interface ChatMessage {
  id: number;
  room_id: number;
  sender: User;
  body: string;
  created_at: string;
  read_by?: number[];
}

export interface Community {
  id: number;
  name: string;
  slug: string;
  description: string;
  members_count: number;
  is_member: boolean;
  cover_color?: string;
}

export type PostType = "discussion" | "question";
export type PostSort = "new" | "top" | "hot";

export interface Post {
  id: number;
  community_id: number;
  community_name?: string;
  author: User;
  title: string;
  body: string;
  type: PostType;
  score: number;
  user_vote?: -1 | 0 | 1;
  comments_count: number;
  accepted_comment_id?: number | null;
  created_at: string;
}

export interface Comment {
  id: number;
  post_id: number;
  author: User;
  body: string;
  score: number;
  user_vote?: -1 | 0 | 1;
  parent_id?: number | null;
  is_accepted?: boolean;
  created_at: string;
}

export interface Badge {
  id: number;
  code: string;
  name: string;
  description: string;
  icon?: string;
  earned_at?: string;
}

export interface XpEvent {
  id: number;
  delta: number;
  reason: string;
  created_at: string;
}

export interface GamificationProfile {
  user: User;
  xp: number;
  level: number;
  next_level_xp: number;
  reputation: number;
  badges: Badge[];
}

export interface LeaderboardEntry {
  rank: number;
  user: User;
  xp: number;
  level: number;
  is_me?: boolean;
}

export type NotificationType =
  | "match"
  | "session"
  | "message"
  | "community"
  | "badge"
  | "system";

export interface AppNotification {
  id: number;
  type: NotificationType;
  title: string;
  body: string;
  read: boolean;
  link?: string;
  created_at: string;
}

export interface IntegrationStatus {
  connected: boolean;
  email?: string;
  expires_at?: string;
}
