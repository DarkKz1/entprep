import type { Question, Passage } from '../types/index';
import { getQType } from '../types/index';
import { getPool, getPassages } from './questionStore';
import { TOPIC_MAP, getTopicQuestions } from '../config/topics';
import { ALL_PROFILES_BASE } from '../config/subjects';

const PROFILE_IDS = new Set(ALL_PROFILES_BASE.map(p => p.id));

export function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

// Deep copy a question to prevent cache mutation
function copyQuestion(q: Question): Question {
  return {
    ...q,
    o: [...q.o],
    ...(q.pairs ? { pairs: q.pairs.map(p => [...p] as [string, string]) } : {}),
    ...(Array.isArray(q.c) ? { c: [...q.c] } : {}),
  };
}

/** Shuffle options for any question type */
function shuffleOptions(q: Question): Question {
  const qType = getQType(q);

  if (qType === 'matching') {
    // MatchingCard handles right-side shuffle via shuffledRightIndices
    // Do NOT shuffle pairs here — it breaks the pair[i][0]↔pair[i][1] correspondence
    return copyQuestion(q);
  }

  if (qType === 'multiple') {
    // 6 options, multiple correct indices
    const indices = shuffleArray(Array.from({ length: q.o.length }, (_, i) => i));
    const correctArr = Array.isArray(q.c) ? q.c : [q.c];
    const newCorrect = correctArr.map(ci => indices.indexOf(ci));
    return { ...q, o: indices.map(i => q.o[i]), c: newCorrect };
  }

  // single: 4 options
  const indices = shuffleArray(Array.from({ length: q.o.length }, (_, i) => i));
  const c = typeof q.c === 'number' ? q.c : q.c[0];
  return { ...q, o: indices.map(i => q.o[i]), c: indices.indexOf(c) };
}

/**
 * Assemble a balanced mix for regular tests on profile subjects.
 * Target: ~70% single, ~15% multiple, ~15% matching.
 * Falls back to single if not enough questions of other types.
 */
function assembleRegularMix(source: Question[], n: number, shuffle: boolean): Question[] {
  const multiTarget = Math.max(1, Math.round(n * 0.15));
  const matchTarget = Math.max(1, Math.round(n * 0.15));

  const singles = source.filter(q => (q.type || 'single') === 'single');
  const multiples = source.filter(q => q.type === 'multiple');
  const matchings = source.filter(q => q.type === 'matching');

  const shuf = <T>(arr: T[]): T[] => shuffle ? shuffleArray(arr) : [...arr];

  const pickedMulti = shuf(multiples).slice(0, multiTarget);
  const pickedMatch = shuf(matchings).slice(0, matchTarget);
  const singleCount = n - pickedMulti.length - pickedMatch.length;
  const pickedSingle = shuf(singles).slice(0, singleCount);

  let result = [...pickedSingle, ...pickedMulti, ...pickedMatch];

  // If total < n, fill from any remaining questions
  if (result.length < n) {
    const usedOis = new Set(result.map(q => q._oi));
    const remaining = source.filter(q => !usedOis.has(q._oi));
    result.push(...shuf(remaining).slice(0, n - result.length));
  }

  result = shuffle ? shuffleArray(result) : result;
  return shuffle ? result.map(shuffleOptions) : result.map(copyQuestion);
}

async function getQs(sid: string, n: number, shuffle: boolean = true, topicId: string | null = null, lang?: 'ru' | 'kk'): Promise<Question[]> {
  if (sid === "reading") {
    const passages: Passage[] = await getPassages(lang);
    const s = shuffle ? shuffleArray(passages) : [...passages];
    const need = Math.ceil(n / 5);
    const ps = s.slice(0, need);
    const r: Question[] = [];
    ps.forEach(p => {
      const pi = passages.indexOf(p);
      p.qs.forEach((q, qi) => r.push({ ...q, _oi: pi * 5 + qi, pt: p.t, px: p.tx }));
    });
    return shuffle ? r.slice(0, n).map(shuffleOptions) : r.slice(0, n).map(copyQuestion);
  }

  const pool: Question[] = await getPool(sid, lang);
  if (!pool || pool.length === 0) return [];

  let source: Question[] = pool;
  if (topicId && TOPIC_MAP[sid]) {
    const topics = TOPIC_MAP[sid]!;
    const isSection = topics.find(t => t.id === topicId);
    if (isSection) {
      // Filter by section (topic) ID
      const hasDbTopics = pool.some(q => q._topic);
      if (hasDbTopics) {
        source = pool.filter(q => q._topic === topicId);
      } else {
        source = getTopicQuestions(pool, isSection.ranges);
      }
    } else {
      // Check if it's a subtopic ID
      const isSubtopic = topics.some(t => t.subtopics?.some(st => st.id === topicId));
      if (isSubtopic) {
        source = pool.filter(q => q._subtopic === topicId);
      }
    }
  }

  // Profile subjects: balanced mix of single/multiple/matching
  if (PROFILE_IDS.has(sid)) {
    return assembleRegularMix(source, Math.min(n, source.length), shuffle);
  }

  // Mandatory subjects: all single-choice
  const take = Math.min(n, source.length);
  const arr = shuffle ? shuffleArray(source) : [...source];
  return shuffle ? arr.slice(0, take).map(shuffleOptions) : arr.slice(0, take).map(copyQuestion);
}

export { shuffleOptions, getQs };
