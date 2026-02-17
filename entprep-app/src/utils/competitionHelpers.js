import { ALL_PROFILES, SUBS } from '../config/questionPools.js';

const DAILY_KEY = 'entprep_daily';

// ==================== PERSONAL BESTS ====================

function getPersonalBests(hist) {
  const bests = {};
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

function isNewRecord(hist, result) {
  const { su, sc } = result;
  const tests = hist.filter(t => t.su === su && t.type !== 'fullent');
  if (tests.length === 0) return { isRecord: true, prevBest: 0, improvement: sc };
  const prevBest = Math.max(...tests.map(t => t.sc || 0));
  if (sc > prevBest) return { isRecord: true, prevBest, improvement: sc - prevBest };
  return { isRecord: false, prevBest, improvement: 0 };
}

// ==================== STREAKS ====================

const MILESTONES = [3, 7, 14, 30, 60, 100];
const STREAK_MESSAGES = [
  [3, "3 дня подряд! Не останавливайся!"],
  [7, "Неделя подряд! Отличная привычка!"],
  [14, "2 недели! Ты — машина!"],
  [30, "Месяц без пропусков! Легенда!"],
  [60, "60 дней! Невероятная дисциплина!"],
  [100, "100 дней! Ты — легенда ЕНТ!"],
];

function getStreakMilestone(current) {
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

function getStreakMotivation(current) {
  if (current === 0) return "Начни серию — пройди тест сегодня!";
  if (current === 1) return "Начало положено! Вернись завтра";
  if (current === 2) return "Ещё день — и серия 3!";
  const ms = getStreakMilestone(current);
  if (ms.message) return ms.message;
  if (ms.next) return `До серии ${ms.next} — ещё ${ms.next - current} дн.`;
  return `${current} дней подряд!`;
}

// ==================== GOALS ====================

function getGoalProgress(hist, goal) {
  if (!goal || !goal.target || !goal.date) return null;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const [y, m, d] = goal.date.split('-').map(Number);
  const targetDate = new Date(y, m - 1, d);
  targetDate.setHours(0, 0, 0, 0);
  const daysLeft = Math.max(0, Math.ceil((targetDate - now) / 86400000));

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

function getScoreHistory(hist, sid) {
  return hist
    .filter(t => t.su === sid && t.type !== 'fullent')
    .map((t, i) => ({ date: t.dt, score: t.sc || 0, index: i }));
}

// ==================== DAILY CHALLENGE ====================

function getTodayStr() {
  return new Date().toISOString().slice(0, 10);
}

function loadDaily() {
  try {
    const raw = localStorage.getItem(DAILY_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch { return null; }
}

function saveDaily(data) {
  localStorage.setItem(DAILY_KEY, JSON.stringify(data));
}

function pickDailySubject(prof) {
  const mandatory = Object.keys(SUBS);
  const allSubs = [...mandatory, ...(prof || [])];
  // Use date as seed for deterministic daily pick
  const today = getTodayStr();
  let hash = 0;
  for (let i = 0; i < today.length; i++) hash = ((hash << 5) - hash + today.charCodeAt(i)) | 0;
  return allSubs[Math.abs(hash) % allSubs.length];
}

function getDailyChallenge(hist, prof) {
  const today = getTodayStr();
  const saved = loadDaily();

  if (saved && saved.date === today) {
    const sub = SUBS[saved.subjectId] || ALL_PROFILES.find(p => p.id === saved.subjectId);
    return { ...saved, sub };
  }

  // Find yesterday's result for comparison
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yStr = yesterday.toISOString().slice(0, 10);
  const prevDaily = saved && saved.date === yStr ? saved : null;

  const subjectId = pickDailySubject(prof);
  const sub = SUBS[subjectId] || ALL_PROFILES.find(p => p.id === subjectId);
  const challenge = {
    date: today,
    subjectId,
    completed: false,
    score: null,
    prevScore: prevDaily?.score || null,
    sub,
  };
  saveDaily(challenge);
  return challenge;
}

function completeDailyChallenge(score) {
  const saved = loadDaily();
  if (!saved) return;
  saveDaily({ ...saved, completed: true, score });
}

// ==================== SUBJECT META HELPER ====================

function getSubjectById(id) {
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
