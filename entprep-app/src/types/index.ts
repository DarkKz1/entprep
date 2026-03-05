// ── Question & Data Types ──────────────────────────────────────────────────

export type QuestionType = 'single' | 'multiple' | 'matching';

export interface Question {
  q: string;
  o: string[];                    // 4 for single, 6 for multiple, [] for matching
  c: number | number[];           // index for single, indices for multiple
  e: string;
  type?: QuestionType;            // default 'single'
  pairs?: [string, string][];     // for matching: 5 pairs [left, right]
  difficulty?: 'easy' | 'medium' | 'hard';
  block?: 'single' | 'context' | 'multiple' | 'matching';
  _oi?: number;
  _topic?: string;
  _subtopic?: string;
  _su?: string;
  pt?: string;
  px?: string;
  // Kazakh translations (same row, shared c/type/difficulty)
  q_kk?: string;
  o_kk?: string[];
  e_kk?: string;
  pairs_kk?: [string, string][];
  pt_kk?: string;
  px_kk?: string;
}

/** Get the question type, defaulting to 'single' for legacy questions */
export function getQType(q: Question): QuestionType {
  return q.type || 'single';
}

/** Get the correct answer index for single-choice questions (backward compat) */
export function getSingleCorrect(q: Question): number {
  return typeof q.c === 'number' ? q.c : q.c[0];
}

/** Type for answers that can be single index, multiple indices, or matching map */
export type AnswerValue = number | number[] | Record<number, number>;

export interface Passage {
  t: string;
  tx: string;
  qs: Omit<Question, '_oi' | '_topic' | 'pt' | 'px'>[];
}

// ── Test Result & History ──────────────────────────────────────────────────

export interface QuestionDetail {
  oi: number;
  ok: boolean;
  su?: string;
  _su?: string;
  tp?: string;  // topic (section) ID from question._topic
  stp?: string; // subtopic ID from question._subtopic
}

export interface TestResult {
  su: string;
  co?: number;
  to?: number;
  sc: number;
  dt: string;
  tm?: number;
  tp?: string;
  type?: 'fullent' | 'regular' | 'duel';
  qd?: QuestionDetail[];
  sections?: Record<string, { correct: number; total: number; score: number }>;
}

// ── User Data & Settings ───────────────────────────────────────────────────

export interface GoalSettings {
  target: number;
  date: string;
}

export interface Settings {
  exp: boolean;
  tmr: boolean;
  shf: boolean;
  theme?: 'light' | 'dark';
  lang?: 'ru' | 'kk';  // UI language: Russian (default) or Kazakh
  goal?: GoalSettings;
  dailyGoal?: number;  // target tests per day (default 3)
  streakFreezeUsedAt?: string; // ISO date — last time streak freeze was used (premium, 1/week)
  pushEnabled?: boolean;       // master push notifications toggle
  pushStreak?: boolean;        // streak reminders (default true)
  pushErrors?: boolean;        // error review reminders (default true)
  pushWeekly?: boolean;        // weekly report (default true)
}

export interface UserData {
  prof: string[];
  hist: TestResult[];
  st: Settings;
  lastLogin?: string;
  is_premium?: boolean;
  premium_until?: string; // ISO date
}

export type PaywallReason = 'daily_limit' | 'fullent' | 'ai' | null;

// ── Subject Configuration ──────────────────────────────────────────────────

export interface SubjectMeta {
  name: string;
  color: string;
}

export interface SubjectConfig {
  id: string;
  name: string;
  icon: string;
  color: string;
  cnt: number;
  pool?: number;
}

export interface ProfileSubject extends SubjectConfig {
  available: boolean;
  examCnt?: number;  // 40 for profile subjects in full ENT exam mode
}

export type SubjectId =
  | 'math' | 'reading' | 'history'
  | 'geography' | 'english' | 'math_profile'
  | 'physics' | 'biology' | 'chemistry'
  | 'world_history' | 'informatics' | 'law' | 'literature';

// ── ENT Exam Config ────────────────────────────────────────────────────────

export interface ENTSection {
  sid: string;
  label: string;
  icon: string;
  cnt: number;
  maxPts: number;
  threshold: number;
  ptsPerQ: number;
}

export interface ProfileBlock {
  key: 'single' | 'context' | 'multiple' | 'matching';
  label: string;
  range: [number, number];      // [start, end] inclusive indices within 40-question section
  count: number;
  questionType: QuestionType;
  ptsPerQ: number;
}

export interface ENTConfigType {
  totalTime: number;
  sections: ENTSection[];
  profileCnt: number;
  profileMaxPts: number;
  profileThreshold: number;
  profilePtsPerQ: number;        // kept for backward compat (average)
  profileBlocks: ProfileBlock[];
}

// ── Topics ─────────────────────────────────────────────────────────────────

export interface Subtopic {
  id: string;
  name: string;
}

export interface Topic {
  id: string;
  name: string;
  icon: string;
  ranges: [number, number][];
  subtopics?: Subtopic[];
}

export type TopicMap = Record<string, Topic[] | null>;

// ── University ─────────────────────────────────────────────────────────────

export interface University {
  n: string;
  c: string;
  i: string;
  min: number;
  tp: 'national' | 'medical' | 'pedagogical' | 'agro' | 'technical' | 'it' | 'other';
  sp: string;
  inf: string;
}

// ── Theme ──────────────────────────────────────────────────────────────────

export type ThemePalette = Record<string, string>;

// ── Screens ────────────────────────────────────────────────────────────────

export type ScreenId =
  | 'home' | 'profile' | 'topics' | 'test'
  | 'fullent' | 'calc' | 'prog' | 'set'
  | 'adaptive' | 'errors' | 'admin' | 'challenge'
  | 'leaderboard' | 'friends' | 'duel';

// ── Navigation ─────────────────────────────────────────────────────────────

export interface ChallengeData {
  subjectId: string;
  score: number;
  topicId?: string | null;
}

// ── Toast ──────────────────────────────────────────────────────────────────

export interface ToastOptions {
  duration?: number;
  action?: () => void;
  actionLabel?: string;
}

export interface ToastItem {
  id: number;
  type: 'error' | 'success' | 'warning' | 'info';
  message: string;
  action?: () => void;
  actionLabel?: string;
}

export interface ToastAPI {
  error: (message: string, opts?: ToastOptions) => void;
  success: (message: string, opts?: ToastOptions) => void;
  warning: (message: string, opts?: ToastOptions) => void;
  info: (message: string, opts?: ToastOptions) => void;
}

// ── Auth ──────────────────────────────────────────────────────────────────

export interface AuthUser {
  id: string;
  email?: string;
  user_metadata?: Record<string, unknown>;
}

// ── Adaptive & Stats ───────────────────────────────────────────────────────

export interface WeaknessAnalysis {
  score: number;
  avg: number;
  trend: 'improving' | 'declining' | 'stable' | 'none';
  count: number;
  message: string;
}

export interface TopicStats {
  id: string;
  name: string;
  icon: string;
  total: number;
  correct: number;
  pct: number;
  weak: boolean;
}

export interface Recommendations {
  weak: (SubjectConfig & WeaknessAnalysis)[];
  strong: (SubjectConfig & WeaknessAnalysis)[];
  overall: number;
  totalTests: number;
}

export interface Streak {
  current: number;
  best: number;
  frozenToday?: boolean; // true if streak was saved by a freeze
}

export interface StreakMilestone {
  isMilestone: boolean;
  milestone: number;
  next: number | null;
  message: string | null;
}

export interface PersonalBest {
  best: number;
  date: string;
  count: number;
}

export interface GoalProgress {
  currentAvg: number;
  approxScore: number;
  target: number;
  pct: number;
  daysLeft: number;
  onTrack: boolean;
}

export interface DailyChallenge {
  date: string;
  subjectId: string;
  completed: boolean;
  score: number | null;
  prevScore: number | null;
  sub: SubjectConfig;
}

// ── Async Data Hook ────────────────────────────────────────────────────────

export interface AsyncDataState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
}

// ── Responsive ────────────────────────────────────────────────────────────

export type { Breakpoint } from '../hooks/useBreakpoint';

// ── Social Types ──────────────────────────────────────────────────────────

export interface Profile {
  id: string;
  nickname: string;
  display_name: string | null;
  avatar_url: string | null;
  level: number;
  xp: number;
  streak: number;
  last_active: string;
}

export type FriendStatus = 'pending' | 'accepted' | 'declined';

export interface Friendship {
  id: number;
  user_id: string;
  friend_id: string;
  status: FriendStatus;
  created_at: string;
  profile: Profile; // the OTHER user's profile (joined client-side)
}

// ── Duel Types ─────────────────────────────────────────────────────────────

export interface DuelQuestion {
  idx: number;
  q: string;
  o: string[];
  _topic?: string;
}

export type DuelStatus = 'waiting' | 'active' | 'finished' | 'expired' | 'forfeit';

export interface DuelState {
  id: number;
  code: string;
  subject: string;
  creator_id: string;
  opponent_id: string | null;
  status: DuelStatus;
  creator_score: number;
  opponent_score: number;
  creator_done: boolean;
  opponent_done: boolean;
  creator_answers: Record<string, number | null>;
  opponent_answers: Record<string, number | null>;
  started_at: string | null;
  finished_at: string | null;
}

// ── Style Types ────────────────────────────────────────────────────────────

export type CSSProperties = React.CSSProperties;
