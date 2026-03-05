import type {
  TestResult,
  SubjectConfig,
  ProfileSubject,
  PersonalBest,
  StreakMilestone,
  GoalProgress,
  DailyChallenge,
} from '../types/index';
import { ALL_PROFILES, SUBS } from '../config/questionPools';

const DAILY_KEY = 'entprep_daily';

// ==================== PERSONAL BESTS ====================

function getPersonalBests(hist: TestResult[]): Record<string, PersonalBest> {
  const bests: Record<string, PersonalBest> = {};
  for (const t of hist) {
    if (t.type === 'fullent' || !t.su || t.sc == null) continue;
    const prev = bests[t.su];
    if (!prev || t.sc > prev.best) {
      bests[t.su] = { best: t.sc, date: t.dt, count: (prev?.count || 0) + 1 };
    } else {
      bests[t.su] = { ...prev, count: prev.count + 1 };
    }
  }
  return bests;
}

function isNewRecord(hist: TestResult[], result: { su: string; sc: number }): { isRecord: boolean; prevBest: number; improvement: number } {
  const { su, sc } = result;
  const tests = hist.filter(t => t.su === su && t.type !== 'fullent');
  if (tests.length === 0) return { isRecord: true, prevBest: 0, improvement: sc };
  const prevBest = Math.max(...tests.map(t => t.sc || 0));
  if (sc > prevBest) return { isRecord: true, prevBest, improvement: sc - prevBest };
  return { isRecord: false, prevBest, improvement: 0 };
}

// ==================== STREAKS ====================

const MILESTONES: number[] = [3, 7, 14, 30, 60, 100];
const STREAK_MESSAGES: [number, string][] = [
  [3, "3 \u0434\u043d\u044f \u043f\u043e\u0434\u0440\u044f\u0434!"],
  [7, "\u041d\u0435\u0434\u0435\u043b\u044f! \u041e\u0433\u043e\u043d\u044c!"],
  [14, "2 \u043d\u0435\u0434\u0435\u043b\u0438! \u041c\u0430\u0448\u0438\u043d\u0430!"],
  [30, "\u041c\u0435\u0441\u044f\u0446! \u041b\u0435\u0433\u0435\u043d\u0434\u0430!"],
  [60, "60 \u0434\u043d\u0435\u0439! \u0421\u0438\u043b\u0430!"],
  [100, "100 \u0434\u043d\u0435\u0439! \u0422\u043e\u043f!"],
];

function getStreakMilestone(current: number): StreakMilestone {
  for (let i = MILESTONES.length - 1; i >= 0; i--) {
    if (current >= MILESTONES[i]) {
      const next = MILESTONES[i + 1] || null;
      return {
        isMilestone: current === MILESTONES[i],
        milestone: MILESTONES[i],
        next,
        message: STREAK_MESSAGES[i][1],
      };
    }
  }
  return { isMilestone: false, milestone: 0, next: 3, message: null };
}

function getStreakMotivation(current: number): string {
  if (current === 0) return "\u041d\u0430\u0447\u043d\u0438 \u0441\u0435\u0440\u0438\u044e \u2014 \u043f\u0440\u043e\u0439\u0434\u0438 \u0442\u0435\u0441\u0442 \u0441\u0435\u0433\u043e\u0434\u043d\u044f!";
  if (current === 1) return "\u041d\u0430\u0447\u0430\u043b\u043e \u043f\u043e\u043b\u043e\u0436\u0435\u043d\u043e! \u0412\u0435\u0440\u043d\u0438\u0441\u044c \u0437\u0430\u0432\u0442\u0440\u0430";
  if (current === 2) return "\u0415\u0449\u0451 \u0434\u0435\u043d\u044c \u2014 \u0438 \u0441\u0435\u0440\u0438\u044f 3!";
  const ms = getStreakMilestone(current);
  if (ms.message) return ms.message;
  if (ms.next) return `\u0414\u043e \u0441\u0435\u0440\u0438\u0438 ${ms.next} \u2014 \u0435\u0449\u0451 ${ms.next - current} \u0434\u043d.`;
  return `${current} \u0434\u043d\u0435\u0439 \u043f\u043e\u0434\u0440\u044f\u0434!`;
}

// ==================== GOALS ====================

function getGoalProgress(hist: TestResult[], goal: { target?: number; date?: string } | null | undefined): GoalProgress | null {
  if (!goal || !goal.target || !goal.date) return null;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const [y, m, d] = goal.date.split('-').map(Number);
  const targetDate = new Date(y, m - 1, d);
  targetDate.setHours(0, 0, 0, 0);
  const daysLeft = Math.max(0, Math.ceil((targetDate.getTime() - now.getTime()) / 86400000));

  const regular = hist.filter(t => t.type !== 'fullent');
  if (regular.length === 0) return { currentAvg: 0, approxScore: 0, target: goal.target, pct: 0, daysLeft, onTrack: false };

  const recent = regular.slice(-10);
  const currentAvg = Math.round(recent.reduce((s, t) => s + (t.sc || 0), 0) / recent.length);

  // Map avg score to rough ENT scale (avg% * 1.4 = approx score out of 140)
  const approxScore = Math.round(currentAvg * 1.4);
  const pct = Math.min(100, Math.round((approxScore / goal.target) * 100));
  const onTrack = approxScore >= goal.target * 0.85;

  return { currentAvg, approxScore, target: goal.target, pct, daysLeft, onTrack };
}

// ==================== SCORE HISTORY ====================

function getScoreHistory(hist: TestResult[], sid: string): { date: string; score: number; index: number }[] {
  return hist
    .filter(t => t.su === sid && t.type !== 'fullent')
    .map((t, i) => ({ date: t.dt, score: t.sc || 0, index: i }));
}

// ==================== DAILY CHALLENGE ====================

function getTodayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function loadDaily(): DailyChallenge | null {
  try {
    const raw = localStorage.getItem(DAILY_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as DailyChallenge;
  } catch { return null; }
}

function saveDaily(data: DailyChallenge): void {
  localStorage.setItem(DAILY_KEY, JSON.stringify(data));
}

function pickDailySubject(prof: string[]): string {
  const mandatory = Object.keys(SUBS);
  const allSubs = [...mandatory, ...(prof || [])];
  // Use date as seed for deterministic daily pick
  const today = getTodayStr();
  let hash = 0;
  for (let i = 0; i < today.length; i++) hash = ((hash << 5) - hash + today.charCodeAt(i)) | 0;
  return allSubs[Math.abs(hash) % allSubs.length];
}

function getDailyChallenge(hist: TestResult[], prof: string[]): DailyChallenge {
  const today = getTodayStr();
  const saved = loadDaily();

  if (saved && saved.date === today) {
    const sub = SUBS[saved.subjectId] || ALL_PROFILES.find(p => p.id === saved.subjectId);
    return { ...saved, sub: sub as SubjectConfig };
  }

  // Find yesterday's result for comparison
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yStr = yesterday.toISOString().slice(0, 10);
  const prevDaily = saved && saved.date === yStr ? saved : null;

  const subjectId = pickDailySubject(prof);
  const sub = SUBS[subjectId] || ALL_PROFILES.find(p => p.id === subjectId);
  const challenge: DailyChallenge = {
    date: today,
    subjectId,
    completed: false,
    score: null,
    prevScore: prevDaily?.score || null,
    sub: sub as SubjectConfig,
  };
  saveDaily(challenge);
  return challenge;
}

function completeDailyChallenge(score: number): void {
  const saved = loadDaily();
  if (!saved) return;
  saveDaily({ ...saved, completed: true, score });
}

// ==================== SUBJECT META HELPER ====================

function getSubjectById(id: string): SubjectConfig | ProfileSubject | null {
  return SUBS[id] || ALL_PROFILES.find(p => p.id === id) || null;
}

export {
  getPersonalBests,
  isNewRecord,
  getStreakMilestone,
  getStreakMotivation,
  getGoalProgress,
  getScoreHistory,
  getDailyChallenge,
  completeDailyChallenge,
  loadDaily,
  getSubjectById,
};
