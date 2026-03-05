// Central question store: memory cache -> Supabase -> localStorage -> static fallback
import { supabase } from '../config/supabase';
import type { Question, Passage } from '../types/index';

const CACHE_KEY = 'entprep_qcache';
const COUNTS_KEY = 'entprep_qcounts';
const DATA_VERSION_KEY = 'entprep_qversion';
const DATA_VERSION = 15; // bump this to invalidate localStorage question cache

// Memory caches
const memCache: Record<string, Question[]> = {};
const passageCache: { data: Passage[] | null } = { data: null };
let countsCache: Record<string, number> | null = null;

// Static file mapping for dynamic import fallback
const STATIC_FILES: Record<string, () => Promise<Question[] | Passage[]>> = {
  math: () => import('../data/questions/math_literacy').then(m => m.MQ),
  reading: () => import('../data/questions/reading_passages').then(m => m.RP),
  history: () => import('../data/questions/history_kz').then(m => m.HQ),
  geography: () => import('../data/questions/geography').then(m => m.GEO),
  english: () => import('../data/questions/english').then(m => m.ENG),
  math_profile: () => import('../data/questions/math_profile').then(m => m.MPQ),
  physics: () => import('../data/questions/physics').then(m => m.PHYS),
  biology: () => import('../data/questions/biology').then(m => m.BIO),
  chemistry: () => import('../data/questions/chemistry').then(m => m.CHEM),
  world_history: () => import('../data/questions/world_history').then(m => m.WH),
  informatics: () => import('../data/questions/informatics').then(m => m.INFO),
  law: () => import('../data/questions/law').then(m => m.LAW),
  literature: () => import('../data/questions/literature').then(m => m.LIT),
};

// --- version check: clear stale question cache ---
try {
  const v = localStorage.getItem(DATA_VERSION_KEY);
  if (v !== String(DATA_VERSION)) {
    Object.keys(localStorage).forEach(k => {
      if (k.startsWith(CACHE_KEY)) localStorage.removeItem(k);
    });
    // Keep COUNTS_KEY — counts are independent of question cache
    localStorage.setItem(DATA_VERSION_KEY, String(DATA_VERSION));
  }
} catch {}

// --- Supabase row type ---
interface SupabaseRow {
  idx: number;
  topic: string;
  subtopic?: string | null;
  q: string;
  o: string[];
  c: number;
  e: string;
  passage_group?: number | null;
  passage_title?: string | null;
  passage_text?: string | null;
  type?: string | null;
  correct_indices?: number[] | null;
  pairs?: [string, string][] | null;
  difficulty?: string | null;
  block?: string | null;
  // Kazakh translations
  q_kk?: string | null;
  o_kk?: string[] | null;
  e_kk?: string | null;
  pairs_kk?: [string, string][] | null;
  passage_title_kk?: string | null;
  passage_text_kk?: string | null;
}

// --- localStorage helpers ---
function lsRead(sid: string): SupabaseRow[] | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY + '_' + sid);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function lsWrite(sid: string, data: SupabaseRow[]): void {
  try { localStorage.setItem(CACHE_KEY + '_' + sid, JSON.stringify(data)); } catch {}
}

function loadCounts(): Record<string, number> {
  if (countsCache) return countsCache;
  try {
    const raw = localStorage.getItem(COUNTS_KEY);
    countsCache = raw ? JSON.parse(raw) : getDefaultCounts();
  } catch {
    countsCache = getDefaultCounts();
  }
  return countsCache!;
}

function saveCounts(counts: Record<string, number>): void {
  countsCache = counts;
  try { localStorage.setItem(COUNTS_KEY, JSON.stringify(counts)); } catch {}
}

function getDefaultCounts(): Record<string, number> {
  return {
    math:150, reading:150, history:150, geography:150, english:150,
    math_profile:150, physics:150, biology:150, chemistry:150,
    world_history:150, informatics:150, law:150, literature:150,
  };
}

// --- Supabase fetch ---
const pending: Partial<Record<string, Promise<Question[]>>> = {};

async function fetchFromSupabase(sid: string): Promise<SupabaseRow[] | null> {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('questions')
      .select('idx,topic,subtopic,q,o,c,e,passage_group,passage_title,passage_text,type,correct_indices,pairs,difficulty,block,q_kk,o_kk,e_kk,pairs_kk,passage_title_kk,passage_text_kk')
      .eq('subject', sid)
      .order('idx', { ascending: true });
    if (error || !data || data.length === 0) return null;
    return data as SupabaseRow[];
  } catch {
    return null;
  }
}

const PREFIX_RE = /^[А-Га-гA-Da-d]\)\s*/;
function stripPrefix(s: string): string { return s.replace(PREFIX_RE, ''); }
function cleanOptions(o: string[]): string[] { return o.map(stripPrefix); }

function supabaseRowToQuestion(row: SupabaseRow): Question {
  const qType = (row.type as Question['type']) || 'single';
  const q: Question = {
    q: row.q,
    o: cleanOptions(row.o),
    c: qType === 'multiple' && row.correct_indices ? row.correct_indices : row.c,
    e: row.e || '',
    _topic: row.topic,
    _subtopic: row.subtopic || undefined,
  };
  if (qType !== 'single') q.type = qType;
  if (row.pairs) q.pairs = row.pairs;
  if (row.difficulty) q.difficulty = row.difficulty as Question['difficulty'];
  if (row.block) q.block = row.block as Question['block'];
  // Attach passage text if present (e.g. English context questions)
  if (row.passage_title) q.pt = row.passage_title;
  if (row.passage_text) q.px = row.passage_text;
  // Kazakh translations
  if (row.q_kk) q.q_kk = row.q_kk;
  if (row.o_kk) q.o_kk = cleanOptions(row.o_kk);
  if (row.e_kk) q.e_kk = row.e_kk;
  if (row.pairs_kk) q.pairs_kk = row.pairs_kk;
  if (row.passage_title_kk) q.pt_kk = row.passage_title_kk;
  if (row.passage_text_kk) q.px_kk = row.passage_text_kk;
  return q;
}

// --- Reading passage reconstruction ---
function buildPassagesFromRows(rows: SupabaseRow[]): Passage[] {
  const groups: Record<number, Passage> = {};
  for (const row of rows) {
    const g = row.passage_group ?? 0;
    if (!groups[g]) groups[g] = { t: row.passage_title || '', tx: row.passage_text || '', qs: [] };
    groups[g].qs.push({
      q: row.q,
      o: cleanOptions(row.o),
      c: row.c,
      e: row.e || '',
    });
  }
  return Object.keys(groups).sort((a, b) => +a - +b).map(k => groups[+k]);
}

// --- Core API ---

function deepFreezeQuestion(q: Question): Question {
  if (q.o) Object.freeze(q.o);
  return Object.freeze(q);
}

type Lang = 'ru' | 'kk';

function clonePool(pool: Question[], lang?: Lang): Question[] {
  return pool.map(q => {
    const cloned = { ...q, o: [...q.o] };
    if (lang === 'kk') {
      if (q.q_kk) cloned.q = q.q_kk;
      if (q.o_kk?.length) cloned.o = [...q.o_kk];
      if (q.e_kk) cloned.e = q.e_kk;
      if (q.pairs_kk) cloned.pairs = q.pairs_kk;
      if (q.pt_kk) cloned.pt = q.pt_kk;
      if (q.px_kk) cloned.px = q.px_kk;
    }
    return cloned;
  });
}

async function getPool(sid: string, lang?: Lang): Promise<Question[]> {
  if (memCache[sid]) return clonePool(memCache[sid], lang);

  if (pending[sid]) {
    const raw = await pending[sid];
    return clonePool(raw, lang);
  }

  pending[sid] = (async () => {
    try {
      // 2. Supabase
      const rows = await fetchFromSupabase(sid);
      if (rows && rows.length > 0) {
        if (sid === 'reading') {
          const passages = buildPassagesFromRows(rows);
          passageCache.data = passages;
          const flat: Question[] = [];
          passages.forEach((p, pi) => {
            p.qs.forEach((q, qi) => flat.push(deepFreezeQuestion({ ...q, _oi: pi * 5 + qi, pt: p.t, px: p.tx })));
          });
          memCache[sid] = flat;
          passages.forEach(p => p.qs.forEach(q => { if (q.o) Object.freeze(q.o); Object.freeze(q); }));
        } else {
          memCache[sid] = rows.map((r, i) => deepFreezeQuestion({ ...supabaseRowToQuestion(r), _oi: i }));
        }
        const counts = loadCounts();
        counts[sid] = sid === 'reading' ? memCache[sid].length : rows.length;
        saveCounts(counts);
        lsWrite(sid, rows);
        return memCache[sid];
      }

      // 3. localStorage cache
      const lsData = lsRead(sid);
      if (lsData && lsData.length > 0) {
        if (sid === 'reading') {
          const passages = buildPassagesFromRows(lsData);
          passageCache.data = passages;
          const flat: Question[] = [];
          passages.forEach((p, pi) => {
            p.qs.forEach((q, qi) => flat.push(deepFreezeQuestion({ ...q, _oi: pi * 5 + qi, pt: p.t, px: p.tx })));
          });
          memCache[sid] = flat;
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
        passageCache.data = staticData as Passage[];
        const flat: Question[] = [];
        (staticData as Passage[]).forEach((p, pi) => {
          p.qs.forEach((q, qi) => flat.push(deepFreezeQuestion({ ...q, _oi: pi * 5 + qi, pt: p.t, px: p.tx })));
        });
        memCache[sid] = flat;
        (staticData as Passage[]).forEach(p => p.qs.forEach(q => { if (q.o) Object.freeze(q.o); Object.freeze(q); }));
      } else {
        memCache[sid] = (staticData as Question[]).map((q, i) => deepFreezeQuestion({ ...q, _oi: i }));
      }
      return memCache[sid];
    } finally {
      delete pending[sid];
    }
  })();

  const raw = await pending[sid]!;
  return clonePool(raw, lang);
}

async function getPassages(lang?: Lang): Promise<Passage[]> {
  if (!passageCache.data) {
    await getPool('reading');
  }
  const cached = passageCache.data as Passage[] | null;
  if (!cached) return [];
  return cached.map(p => ({
    ...p,
    qs: p.qs.map(q => ({ ...q, o: [...q.o] }))
  }));
}

function getPoolSize(sid: string): number {
  const counts = loadCounts();
  return counts[sid] || 150;
}

function getTotalQ(): number {
  const counts = loadCounts();
  return Object.values(counts).reduce((s, n) => s + n, 0);
}

/** Fast count-only fetch from Supabase (no question data). Returns true if counts were updated. */
async function prefetchCounts(): Promise<boolean> {
  if (!supabase) return false;
  try {
    const subjects = Object.keys(getDefaultCounts());
    const counts: Record<string, number> = {};
    await Promise.all(subjects.map(async (sid) => {
      const { count, error } = await supabase!
        .from('questions')
        .select('*', { count: 'exact', head: true })
        .eq('subject', sid);
      if (!error && typeof count === 'number') counts[sid] = count;
    }));
    if (Object.keys(counts).length > 0) {
      saveCounts(counts);
      return true;
    }
  } catch {}
  return false;
}

async function prefetchSubjects(sids: string[]): Promise<void> {
  await Promise.all(sids.map(sid => getPool(sid)));
}

async function resolveQuestion(sid: string, idx: number, lang?: Lang): Promise<Question | null> {
  const pool = await getPool(sid, lang);
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

export { getPool, getPassages, getPoolSize, getTotalQ, prefetchCounts, prefetchSubjects, resolveQuestion };
