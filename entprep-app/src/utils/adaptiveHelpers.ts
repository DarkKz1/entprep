import type { TestResult, WeaknessAnalysis, TopicStats, Recommendations, Streak } from '../types/index';
import { ALL_PROFILES, SUBS } from '../config/questionPools';
import { TOPIC_MAP } from '../config/topics';

// Local return type that widens trend to include 'none' for empty history
interface WeaknessResult extends Omit<WeaknessAnalysis, 'trend'> {
  trend: 'improving' | 'declining' | 'stable' | 'none';
}

// Subject recommendation entry (used internally for sorted arrays)
interface SubjectRecommendation {
  id: string;
  name: string;
  icon: string;
  color: string;
  score: number;
  avg: number;
  trend: 'improving' | 'declining' | 'stable' | 'none';
  count: number;
  message: string;
}

// Get subject metadata (name, icon, color) by ID
function getSubjectMeta(subjectId: string): { name: string; icon: string; color: string } {
  const mandatory = SUBS[subjectId];
  if (mandatory) return { name: mandatory.name, icon: mandatory.icon, color: mandatory.color };
  const profile = ALL_PROFILES.find(p => p.id === subjectId);
  if (profile) return { name: profile.name, icon: profile.icon, color: profile.color };
  return { name: subjectId, icon: "\u{1F4DD}", color: "#94a3b8" };
}

// Calculate weakness score for a single subject
function calcWeakness(subjectId: string, hist: TestResult[]): WeaknessResult {
  const tests = hist.filter(t => t.su === subjectId && t.type !== "fullent");
  if (tests.length === 0) {
    return { score: 50, avg: 0, trend: "none", count: 0, message: "\u041d\u0430\u0447\u043d\u0438 \u043f\u0435\u0440\u0432\u044b\u0439 \u0442\u0435\u0441\u0442!" };
  }

  const recent = tests.slice(-5);
  const avg = Math.round(recent.reduce((s, t) => s + (t.sc || 0), 0) / recent.length);

  // Trend: compare first half vs second half of recent tests
  let trend: 'improving' | 'declining' | 'stable' = "stable";
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

  let message: string;
  if (trend === "declining") message = "\u0411\u0430\u043b\u043b \u043f\u0430\u0434\u0430\u0435\u0442! \u041d\u0443\u0436\u043d\u0430 \u043f\u0440\u0430\u043a\u0442\u0438\u043a\u0430";
  else if (avg < 50) message = "\u0415\u0441\u0442\u044c \u0441\u0435\u0440\u044c\u0451\u0437\u043d\u044b\u0435 \u043f\u0440\u043e\u0431\u0435\u043b\u044b";
  else if (avg < 70) message = "\u0415\u0441\u0442\u044c \u043f\u0440\u043e\u0431\u0435\u043b\u044b, \u043c\u043e\u0436\u043d\u043e \u0443\u043b\u0443\u0447\u0448\u0438\u0442\u044c";
  else if (trend === "improving") message = "\u041e\u0442\u043b\u0438\u0447\u043d\u044b\u0439 \u043f\u0440\u043e\u0433\u0440\u0435\u0441\u0441!";
  else message = "\u0425\u043e\u0440\u043e\u0448\u0438\u0439 \u0443\u0440\u043e\u0432\u0435\u043d\u044c";

  return { score, avg, trend, count: tests.length, message };
}

// Get sorted recommendations for all student's subjects
function getRecommendations(hist: TestResult[], prof: string[]): Recommendations {
  const subjectIds: string[] = [
    ...Object.keys(SUBS),
    ...prof,
  ];

  const totalTests = hist.filter(t => t.type !== "fullent").length;
  const overallAvg = totalTests
    ? Math.round(hist.filter(t => t.type !== "fullent").reduce((s, t) => s + (t.sc || 0), 0) / totalTests)
    : 0;

  const subjects: SubjectRecommendation[] = subjectIds.map(id => {
    const w = calcWeakness(id, hist);
    const meta = getSubjectMeta(id);
    return { id, ...meta, ...w };
  });

  // Sort by weakness score descending (weakest first)
  subjects.sort((a, b) => b.score - a.score);

  // Split into weak (score > 40) and strong
  const weak = subjects.filter(s => s.score > 40);
  const strong = subjects.filter(s => s.score <= 40);

  return { weak, strong, overall: overallAvg, totalTests } as Recommendations;
}

// Find which topic a question index belongs to
function getTopicForIndex(sid: string, oi: number): string | null {
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
function calcTopicStats(subjectId: string, hist: TestResult[]): TopicStats[] | null {
  if (subjectId === "reading" || !TOPIC_MAP[subjectId]) return null;
  const tests = hist.filter(t => t.su === subjectId && t.qd && t.type !== "fullent").slice(-10);
  if (tests.length === 0) return null;

  const topics = TOPIC_MAP[subjectId]!;
  const buckets: Record<string, { total: number; correct: number }> = {};
  for (const t of topics) buckets[t.id] = { total: 0, correct: 0 };

  for (const test of tests) {
    for (const q of test.qd!) {
      const tid = q.tp || getTopicForIndex(subjectId, q.oi);
      if (tid && buckets[tid]) {
        buckets[tid].total++;
        if (q.ok) buckets[tid].correct++;
      }
    }
  }

  return topics.map(t => ({
    id: t.id,
    name: t.name,
    name_kk: t.name_kk,
    icon: t.icon,
    total: buckets[t.id].total,
    correct: buckets[t.id].correct,
    pct: buckets[t.id].total > 0 ? Math.round(buckets[t.id].correct / buckets[t.id].total * 100) : -1,
    weak: buckets[t.id].total > 0 && (buckets[t.id].correct / buckets[t.id].total * 100) < 60,
  }));
}

// Get wrong questions from recent tests
function getWrongQuestions(hist: TestResult[], limit: number = 50): { su: string; oi: number; dt: string }[] {
  const tests = hist.filter(t => t.qd && t.type !== "fullent").slice(-20);
  const seen = new Set<string>();
  const result: { su: string; oi: number; dt: string }[] = [];
  for (let i = tests.length - 1; i >= 0; i--) {
    const t = tests[i];
    for (const q of t.qd!) {
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
function calcBest(sorted: Date[]): number {
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
// freezeDate: ISO string of last freeze usage (from settings.streakFreezeUsedAt)
// isPremium: whether user has premium (freeze only works for premium)
function calcStreak(hist: TestResult[], isPremium = false, freezeDate?: string): Streak {
  const dates = new Set<string>();
  for (const t of hist) {
    if (t.dt && t.type !== "fullent") dates.add(t.dt);
  }
  if (dates.size === 0) return { current: 0, best: 0 };

  const parse = (d: string): Date => { const [dd, mm, yy] = d.split("."); return new Date(+yy, +mm - 1, +dd); };
  const sorted = [...dates].map(parse).sort((a, b) => a.getTime() - b.getTime());

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const DAY = 86400000;
  const last = sorted[sorted.length - 1].getTime();
  const todayMs = today.getTime();
  const gap = todayMs - last;

  // No test today and gap > 1 day — check if freeze can save the streak
  if (gap > DAY) {
    // Freeze: premium only, gap is exactly 2 days (missed 1 day), not used in last 7 days
    if (isPremium && gap <= 2 * DAY) {
      const freezeAvailable = !freezeDate || (todayMs - new Date(freezeDate).getTime() >= 7 * DAY);
      if (freezeAvailable) {
        // Freeze saves the streak — count streak as if the missed day existed
        let current = 1; // the last active day
        let check = last;
        for (let i = sorted.length - 2; i >= 0; i--) {
          const d = sorted[i].getTime();
          if (check - d === DAY) { current++; check = d; }
          else if (d === check) continue;
          else break;
        }
        return { current, best: Math.max(current, calcBest(sorted)), frozenToday: true };
      }
    }
    return { current: 0, best: calcBest(sorted) };
  }

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

// Per-subtopic stats for a section from recent tests with qd
function calcSubtopicStats(subjectId: string, sectionId: string, hist: TestResult[]): TopicStats[] | null {
  const topics = TOPIC_MAP[subjectId];
  if (!topics) return null;
  const section = topics.find(t => t.id === sectionId);
  if (!section?.subtopics || section.subtopics.length <= 1) return null;

  const tests = hist.filter(t => t.su === subjectId && t.qd && t.type !== "fullent").slice(-10);
  if (tests.length === 0) return null;

  const buckets: Record<string, { total: number; correct: number }> = {};
  for (const st of section.subtopics) buckets[st.id] = { total: 0, correct: 0 };

  for (const test of tests) {
    for (const q of test.qd!) {
      if (q.stp && buckets[q.stp]) {
        buckets[q.stp].total++;
        if (q.ok) buckets[q.stp].correct++;
      }
    }
  }

  return section.subtopics.map(st => ({
    id: st.id,
    name: st.name,
    name_kk: st.name_kk,
    icon: '',
    total: buckets[st.id].total,
    correct: buckets[st.id].correct,
    pct: buckets[st.id].total > 0 ? Math.round(buckets[st.id].correct / buckets[st.id].total * 100) : -1,
    weak: buckets[st.id].total > 0 && (buckets[st.id].correct / buckets[st.id].total * 100) < 60,
  }));
}

// Weak topic recommendation for Home screen
interface WeakTopicRec {
  subjectId: string;
  subjectName: string;
  topicId: string;
  topicName: string;
  topicIcon: string;
  pct: number;
}

function getTopWeakTopic(hist: TestResult[], prof: string[]): WeakTopicRec | null {
  const recs = getRecommendations(hist, prof);
  for (const sub of recs.weak.slice(0, 3)) {
    const topics = calcTopicStats(sub.id, hist);
    if (!topics) continue;
    const weakTopics = topics.filter(t => t.weak && t.total >= 3);
    if (weakTopics.length === 0) continue;
    weakTopics.sort((a, b) => a.pct - b.pct);
    const worst = weakTopics[0];
    return {
      subjectId: sub.id,
      subjectName: sub.name,
      topicId: worst.id,
      topicName: worst.name,
      topicIcon: worst.icon,
      pct: worst.pct,
    };
  }
  return null;
}

export { calcWeakness, getRecommendations, calcTopicStats, calcSubtopicStats, getWrongQuestions, getTopicForIndex, calcStreak, getTopWeakTopic };
