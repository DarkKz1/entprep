import { ALL_PROFILES, SUBS } from '../config/questionPools.js';
import { TOPIC_MAP } from '../config/topics.js';

// Get subject metadata (name, icon, color) by ID
function getSubjectMeta(subjectId) {
  const mandatory = SUBS[subjectId];
  if (mandatory) return { name: mandatory.name, icon: mandatory.icon, color: mandatory.color };
  const profile = ALL_PROFILES.find(p => p.id === subjectId);
  if (profile) return { name: profile.name, icon: profile.icon, color: profile.color };
  return { name: subjectId, icon: "📝", color: "#94a3b8" };
}

// Calculate weakness score for a single subject
function calcWeakness(subjectId, hist) {
  const tests = hist.filter(t => t.su === subjectId && t.type !== "fullent");
  if (tests.length === 0) {
    return { score: 50, avg: 0, trend: "none", count: 0, message: "Начни первый тест!" };
  }

  const recent = tests.slice(-5);
  const avg = Math.round(recent.reduce((s, t) => s + (t.sc || 0), 0) / recent.length);

  // Trend: compare first half vs second half of recent tests
  let trend = "stable";
  if (recent.length >= 2) {
    const mid = Math.floor(recent.length / 2);
    const firstHalf = recent.slice(0, mid);
    const secondHalf = recent.slice(mid);
    const avgFirst = firstHalf.reduce((s, t) => s + (t.sc || 0), 0) / firstHalf.length;
    const avgSecond = secondHalf.reduce((s, t) => s + (t.sc || 0), 0) / secondHalf.length;
    const diff = avgSecond - avgFirst;
    if (diff >= 8) trend = "improving";
    else if (diff <= -8) trend = "declining";
  }

  const trendPenalty = trend === "declining" ? 15 : trend === "improving" ? -10 : 0;
  const score = Math.max(0, Math.min(100, (100 - avg) * 0.6 + trendPenalty * 0.4));

  let message;
  if (trend === "declining") message = "Балл падает! Нужна практика";
  else if (avg < 50) message = "Есть серьёзные пробелы";
  else if (avg < 70) message = "Есть пробелы, можно улучшить";
  else if (trend === "improving") message = "Отличный прогресс!";
  else message = "Хороший уровень";

  return { score, avg, trend, count: tests.length, message };
}

// Get sorted recommendations for all student's subjects
function getRecommendations(hist, prof) {
  const subjectIds = [
    ...Object.keys(SUBS),
    ...prof,
  ];

  const totalTests = hist.filter(t => t.type !== "fullent").length;
  const overallAvg = totalTests
    ? Math.round(hist.filter(t => t.type !== "fullent").reduce((s, t) => s + (t.sc || 0), 0) / totalTests)
    : 0;

  const subjects = subjectIds.map(id => {
    const w = calcWeakness(id, hist);
    const meta = getSubjectMeta(id);
    return { id, ...meta, ...w };
  });

  // Sort by weakness score descending (weakest first)
  subjects.sort((a, b) => b.score - a.score);

  // Split into weak (score > 40) and strong
  const weak = subjects.filter(s => s.score > 40);
  const strong = subjects.filter(s => s.score <= 40);

  return { weak, strong, overall: overallAvg, totalTests };
}

// Find which topic a question index belongs to
function getTopicForIndex(sid, oi) {
  const topics = TOPIC_MAP[sid];
  if (!topics) return null;
  for (const t of topics) {
    for (const [start, end] of t.ranges) {
      if (oi >= start && oi <= end) return t.id;
    }
  }
  return null;
}

// Per-topic stats for a subject from recent tests with qd
function calcTopicStats(subjectId, hist) {
  if (subjectId === "reading" || !TOPIC_MAP[subjectId]) return null;
  const tests = hist.filter(t => t.su === subjectId && t.qd && t.type !== "fullent").slice(-10);
  if (tests.length === 0) return null;

  const topics = TOPIC_MAP[subjectId];
  const buckets = {};
  for (const t of topics) buckets[t.id] = { total: 0, correct: 0 };

  for (const test of tests) {
    for (const q of test.qd) {
      const tid = getTopicForIndex(subjectId, q.oi);
      if (tid && buckets[tid]) {
        buckets[tid].total++;
        if (q.ok) buckets[tid].correct++;
      }
    }
  }

  return topics.map(t => ({
    id: t.id,
    name: t.name,
    icon: t.icon,
    total: buckets[t.id].total,
    correct: buckets[t.id].correct,
    pct: buckets[t.id].total > 0 ? Math.round(buckets[t.id].correct / buckets[t.id].total * 100) : -1,
    weak: buckets[t.id].total > 0 && (buckets[t.id].correct / buckets[t.id].total * 100) < 60,
  }));
}

// Get wrong questions from recent tests
function getWrongQuestions(hist, limit = 50) {
  const tests = hist.filter(t => t.qd && t.type !== "fullent").slice(-20);
  const seen = new Set();
  const result = [];
  for (let i = tests.length - 1; i >= 0; i--) {
    const t = tests[i];
    for (const q of t.qd) {
      if (!q.ok) {
        const key = t.su + ":" + q.oi;
        if (!seen.has(key)) {
          seen.add(key);
          result.push({ su: t.su, oi: q.oi, dt: t.dt });
          if (result.length >= limit) return result;
        }
      }
    }
  }
  return result;
}

// Best streak from sorted date array
function calcBest(sorted) {
  let best = 1, run = 1;
  const DAY = 86400000;
  for (let i = 1; i < sorted.length; i++) {
    const diff = sorted[i].getTime() - sorted[i - 1].getTime();
    if (diff === DAY) { run++; best = Math.max(best, run); }
    else if (diff > DAY) run = 1;
  }
  return best;
}

// Calculate current and best day streak from test history
function calcStreak(hist) {
  const dates = new Set();
  for (const t of hist) {
    if (t.dt && t.type !== "fullent") dates.add(t.dt);
  }
  if (dates.size === 0) return { current: 0, best: 0 };

  const parse = d => { const [dd, mm, yy] = d.split("."); return new Date(+yy, +mm - 1, +dd); };
  const sorted = [...dates].map(parse).sort((a, b) => a - b);

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const DAY = 86400000;
  const last = sorted[sorted.length - 1].getTime();
  const todayMs = today.getTime();

  if (todayMs - last > DAY) return { current: 0, best: calcBest(sorted) };

  let current = 1;
  let check = last === todayMs ? todayMs : last;
  for (let i = sorted.length - 2; i >= 0; i--) {
    const d = sorted[i].getTime();
    if (check - d === DAY) { current++; check = d; }
    else if (d === check) continue;
    else break;
  }

  return { current, best: Math.max(current, calcBest(sorted)) };
}

export { calcWeakness, getRecommendations, calcTopicStats, getWrongQuestions, getTopicForIndex, calcStreak };
