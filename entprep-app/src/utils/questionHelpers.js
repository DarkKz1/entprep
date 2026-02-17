import { getPool, getPassages } from './questionStore.js';
import { TOPIC_MAP, getTopicQuestions } from '../config/topics.js';

function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

// Deep copy a question to prevent cache mutation
function copyQuestion(q) {
  return { ...q, o: [...q.o] };
}

function shuffleOptions(q) {
  const indices = shuffleArray([0, 1, 2, 3]);
  return { ...q, o: indices.map(i => q.o[i]), c: indices.indexOf(q.c) };
}

async function getQs(sid, n, shuffle = true, topicId = null) {
  if (sid === "reading") {
    const passages = await getPassages();
    const s = shuffle ? shuffleArray(passages) : [...passages];
    const need = Math.ceil(n / 5);
    const ps = s.slice(0, need);
    const r = [];
    ps.forEach(p => {
      const pi = passages.indexOf(p);
      p.qs.forEach((q, qi) => r.push({ ...q, _oi: pi * 5 + qi, pt: p.t, px: p.tx }));
    });
    return shuffle ? r.slice(0, n).map(shuffleOptions) : r.slice(0, n).map(copyQuestion);
  }

  const pool = await getPool(sid);
  if (!pool || pool.length === 0) return [];

  let source = pool;
  if (topicId && TOPIC_MAP[sid]) {
    const topic = TOPIC_MAP[sid].find(t => t.id === topicId);
    if (topic) {
      // Check if questions have _topic from DB
      const hasDbTopics = pool.some(q => q._topic);
      if (hasDbTopics) {
        source = pool.filter(q => q._topic === topicId);
      } else {
        source = getTopicQuestions(pool, topic.ranges);
      }
    }
  }
  const take = Math.min(n, source.length);
  const arr = shuffle ? shuffleArray(source) : [...source];
  return shuffle ? arr.slice(0, take).map(shuffleOptions) : arr.slice(0, take).map(copyQuestion);
}

export { shuffleOptions, getQs };
