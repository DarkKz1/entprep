import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
const env = readFileSync('.env','utf8');
env.split('\n').forEach(l => { const [k,...v] = l.split('='); if (k && !k.startsWith('#')) process.env[k.trim()] = v.join('=').trim(); });

const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function fetchPool(sid) {
  const { data } = await sb.from('questions')
    .select('idx,topic,q,o,c,e,passage_group,passage_title,passage_text,type,correct_indices,pairs,difficulty,block')
    .eq('subject', sid).order('idx');
  return data.map((r, i) => {
    const q = { q: r.q, o: r.o, c: r.c, e: r.e, _oi: i, _topic: r.topic };
    if (r.type && r.type !== 'single') q.type = r.type;
    if (r.pairs) q.pairs = r.pairs;
    if (r.difficulty) q.difficulty = r.difficulty;
    if (r.block) q.block = r.block;
    if (r.passage_title) q.pt = r.passage_title;
    if (r.passage_text) q.px = r.passage_text;
    return q;
  });
}

const pool = await fetchPool('informatics');

// Exactly like assembleProfileSection does for context block
const BLOCKS = [
  { label: 'Одиночный выбор', range: [0, 24], count: 25, questionType: 'single', ptsPerQ: 1 },
  { label: 'Контекстные', range: [25, 29], count: 5, questionType: 'single', ptsPerQ: 1 },
  { label: 'Множественный выбор', range: [30, 34], count: 5, questionType: 'multiple', ptsPerQ: 2 },
  { label: 'Соответствие', range: [35, 39], count: 5, questionType: 'matching', ptsPerQ: 2 },
];

const result = [];
for (const block of BLOCKS) {
  let candidates;
  if (block.questionType === 'single' && block.label.includes('Контекст')) {
    candidates = pool.filter(q => q.block === 'context' || (q.pt && q.px));
  } else {
    candidates = pool.filter(q => {
      const qt = q.type || 'single';
      return qt === block.questionType;
    });
  }

  const picked = candidates.slice(0, block.count);

  // Fallback
  if (picked.length < block.count) {
    const usedOis = new Set([...result.map(q => q._oi), ...picked.map(q => q._oi)]);
    const fillers = pool.filter(q => !usedOis.has(q._oi) && (q.type || 'single') === 'single').slice(0, block.count - picked.length);
    console.log(`Block "${block.label}": ${picked.length} found, ${fillers.length} FILLERS needed`);
    picked.push(...fillers);
  }

  result.push(...picked);
}

console.log('\n=== Questions at index 25-29 (context block) ===');
result.slice(25, 30).forEach((q, i) => {
  console.log(`[${25+i}]: hasPt=${!!q.pt} hasPx=${!!q.px} block=${q.block||'none'} pt="${(q.pt||'').substring(0,40)}" pxLen=${(q.px||'').length}`);
});
