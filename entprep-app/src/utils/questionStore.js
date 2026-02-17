// Central question store: memory cache -> Supabase -> localStorage -> static fallback
import { supabase } from '../config/supabase.js';
import { TOPIC_MAP } from '../config/topics.js';

const CACHE_KEY = 'entprep_qcache';
const COUNTS_KEY = 'entprep_qcounts';
const DATA_VERSION_KEY = 'entprep_qversion';
const DATA_VERSION = 3; // bump this to invalidate localStorage question cache

// Memory caches
const memCache = {};    // sid -> Question[]
const passageCache = { data: null }; // RP-style passages array
let countsCache = null; // { sid: number }

// Static file mapping for dynamic import fallback
const STATIC_FILES = {
  math: () => import('../data/questions/math_literacy.js').then(m => m.MQ),
  reading: () => import('../data/questions/reading_passages.js').then(m => m.RP),
  history: () => import('../data/questions/history_kz.js').then(m => m.HQ),
  geography: () => import('../data/questions/geography.js').then(m => m.GEO),
  english: () => import('../data/questions/english.js').then(m => m.ENG),
  math_profile: () => import('../data/questions/math_profile.js').then(m => m.MPQ),
  physics: () => import('../data/questions/physics.js').then(m => m.PHYS),
  biology: () => import('../data/questions/biology.js').then(m => m.BIO),
  chemistry: () => import('../data/questions/chemistry.js').then(m => m.CHEM),
  world_history: () => import('../data/questions/world_history.js').then(m => m.WH),
  informatics: () => import('../data/questions/informatics.js').then(m => m.INFO),
  law: () => import('../data/questions/law.js').then(m => m.LAW),
  literature: () => import('../data/questions/literature.js').then(m => m.LIT),
};

// --- version check: clear stale question cache ---
try {
  const v = localStorage.getItem(DATA_VERSION_KEY);
  if (v !== String(DATA_VERSION)) {
    Object.keys(localStorage).forEach(k => {
      if (k.startsWith(CACHE_KEY)) localStorage.removeItem(k);
    });
    localStorage.removeItem(COUNTS_KEY);
    localStorage.setItem(DATA_VERSION_KEY, String(DATA_VERSION));
  }
} catch {}

// --- localStorage helpers ---
function lsRead(sid) {
  try {
    const raw = localStorage.getItem(CACHE_KEY + '_' + sid);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function lsWrite(sid, data) {
  try { localStorage.setItem(CACHE_KEY + '_' + sid, JSON.stringify(data)); } catch {}
}

function loadCounts() {
  if (countsCache) return countsCache;
  try {
    const raw = localStorage.getItem(COUNTS_KEY);
    countsCache = raw ? JSON.parse(raw) : getDefaultCounts();
  } catch {
    countsCache = getDefaultCounts();
  }
  return countsCache;
}

function saveCounts(counts) {
  countsCache = counts;
  try { localStorage.setItem(COUNTS_KEY, JSON.stringify(counts)); } catch {}
}

function getDefaultCounts() {
  // Hardcoded defaults matching 1,950 questions (150 each)
  return {
    math:150, reading:150, history:150, geography:150, english:150,
    math_profile:150, physics:150, biology:150, chemistry:150,
    world_history:150, informatics:150, law:150, literature:150,
  };
}

// --- Supabase fetch ---
// Pending promises to avoid duplicate fetches
const pending = {};

async function fetchFromSupabase(sid) {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('questions')
      .select('idx,topic,q,o,c,e,passage_group,passage_title,passage_text')
      .eq('subject', sid)
      .order('idx', { ascending: true });
    if (error || !data || data.length === 0) return null;
    return data;
  } catch {
    return null;
  }
}

function supabaseRowToQuestion(row) {
  return {
    q: row.q,
    o: row.o,
    c: row.c,
    e: row.e || '',
    _topic: row.topic,
  };
}

// --- Reading passage reconstruction ---
function buildPassagesFromRows(rows) {
  const groups = {};
  for (const row of rows) {
    const g = row.passage_group ?? 0;
    if (!groups[g]) groups[g] = { t: row.passage_title || '', tx: row.passage_text || '', qs: [] };
    groups[g].qs.push({
      q: row.q,
      o: row.o,
      c: row.c,
      e: row.e || '',
    });
  }
  return Object.keys(groups).sort((a, b) => +a - +b).map(k => groups[k]);
}

// --- Core API ---

// Freeze question and its options array to catch any mutation attempts
function deepFreezeQuestion(q) {
  if (q.o) Object.freeze(q.o);
  return Object.freeze(q);
}

// Deep-clone pool to prevent any consumer from mutating the cache
function clonePool(pool) {
  return pool.map(q => ({ ...q, o: [...q.o] }));
}

/**
 * Get question pool for a subject. Async with 3-level fallback.
 * Returns Question[] (flat array). Always returns deep copies.
 */
async function getPool(sid) {
  // 1. Memory cache — return clone to protect cache
  if (memCache[sid]) return clonePool(memCache[sid]);

  // Deduplicate concurrent fetches — clone on resolve
  if (pending[sid]) {
    const raw = await pending[sid];
    return clonePool(raw);
  }

  pending[sid] = (async () => {
    try {
      // 2. Supabase
      const rows = await fetchFromSupabase(sid);
      if (rows && rows.length > 0) {
        if (sid === 'reading') {
          const passages = buildPassagesFromRows(rows);
          passageCache.data = passages;
          // Flatten for pool
          const flat = [];
          passages.forEach((p, pi) => {
            p.qs.forEach((q, qi) => flat.push(deepFreezeQuestion({ ...q, _oi: pi * 5 + qi, pt: p.t, px: p.tx })));
          });
          memCache[sid] = flat;
          // Freeze passage cache questions to prevent mutation via shared references
          passages.forEach(p => p.qs.forEach(q => { if (q.o) Object.freeze(q.o); Object.freeze(q); }));
        } else {
          memCache[sid] = rows.map((r, i) => deepFreezeQuestion({ ...supabaseRowToQuestion(r), _oi: i }));
        }
        // Update counts
        const counts = loadCounts();
        counts[sid] = sid === 'reading' ? memCache[sid].length : rows.length;
        saveCounts(counts);
        // Cache to localStorage
        lsWrite(sid, rows);
        return memCache[sid];
      }

      // 3. localStorage cache
      const lsData = lsRead(sid);
      if (lsData && lsData.length > 0) {
        if (sid === 'reading') {
          const passages = buildPassagesFromRows(lsData);
          passageCache.data = passages;
          const flat = [];
          passages.forEach((p, pi) => {
            p.qs.forEach((q, qi) => flat.push(deepFreezeQuestion({ ...q, _oi: pi * 5 + qi, pt: p.t, px: p.tx })));
          });
          memCache[sid] = flat;
          // Freeze passage cache questions to prevent mutation via shared references
          passages.forEach(p => p.qs.forEach(q => { if (q.o) Object.freeze(q.o); Object.freeze(q); }));
        } else {
          memCache[sid] = lsData.map((r, i) => deepFreezeQuestion({ ...supabaseRowToQuestion(r), _oi: i }));
        }
        return memCache[sid];
      }

      // 4. Static fallback (dynamic import)
      const loader = STATIC_FILES[sid];
      if (!loader) return [];
      const staticData = await loader();
      if (sid === 'reading') {
        passageCache.data = staticData;
        const flat = [];
        staticData.forEach((p, pi) => {
          p.qs.forEach((q, qi) => flat.push(deepFreezeQuestion({ ...q, _oi: pi * 5 + qi, pt: p.t, px: p.tx })));
        });
        memCache[sid] = flat;
        // Freeze passage cache questions to prevent mutation via shared references
        staticData.forEach(p => p.qs.forEach(q => { if (q.o) Object.freeze(q.o); Object.freeze(q); }));
      } else {
        memCache[sid] = staticData.map((q, i) => deepFreezeQuestion({ ...q, _oi: i }));
      }
      return memCache[sid];
    } finally {
      delete pending[sid];
    }
  })();

  const raw = await pending[sid];
  return clonePool(raw);
}

/**
 * Get reading passages in RP format (array of {t, tx, qs}).
 */
async function getPassages() {
  if (passageCache.data) {
    return passageCache.data.map(p => ({
      ...p,
      qs: p.qs.map(q => ({ ...q, o: [...q.o] }))
    }));
  }
  await getPool('reading');
  if (!passageCache.data) return [];
  return passageCache.data.map(p => ({
    ...p,
    qs: p.qs.map(q => ({ ...q, o: [...q.o] }))
  }));
}

/**
 * Get pool size for a subject. Sync, reads from counts cache.
 */
function getPoolSize(sid) {
  const counts = loadCounts();
  return counts[sid] || 150;
}

/**
 * Get total question count. Sync.
 */
function getTotalQ() {
  const counts = loadCounts();
  return Object.values(counts).reduce((s, n) => s + n, 0);
}

/**
 * Prefetch multiple subjects in parallel.
 */
async function prefetchSubjects(sids) {
  await Promise.all(sids.map(sid => getPool(sid)));
}

/**
 * Resolve a single question by subject and original index. Async.
 * Returns a deep copy to prevent cache mutation.
 */
async function resolveQuestion(sid, idx) {
  const pool = await getPool(sid);
  if (sid === 'reading') {
    const found = pool.find(q => q._oi === idx);
    return found ? { ...found, o: [...found.o] } : null;
  }
  if (idx < pool.length) {
    const q = pool[idx];
    return { ...q, o: [...q.o] };
  }
  return null;
}

export { getPool, getPassages, getPoolSize, getTotalQ, prefetchSubjects, resolveQuestion };
