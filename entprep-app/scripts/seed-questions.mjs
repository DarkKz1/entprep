// Seed script: imports all 13 question files + TOPIC_MAP, inserts into Supabase
// Usage: SUPABASE_URL=xxx SUPABASE_SERVICE_KEY=yyy node scripts/seed-questions.mjs

import { createClient } from '@supabase/supabase-js';
import { fileURLToPath, pathToFileURL } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const srcDir = join(__dirname, '..', 'src');
const toURL = (p) => pathToFileURL(p).href;

// Dynamic import of question files (ES modules)
const { MQ } = await import(toURL(join(srcDir, 'data/questions/math_literacy.js')));
const { RP } = await import(toURL(join(srcDir, 'data/questions/reading_passages.js')));
const { HQ } = await import(toURL(join(srcDir, 'data/questions/history_kz.js')));
const { GEO } = await import(toURL(join(srcDir, 'data/questions/geography.js')));
const { ENG } = await import(toURL(join(srcDir, 'data/questions/english.js')));
const { MPQ } = await import(toURL(join(srcDir, 'data/questions/math_profile.js')));
const { PHYS } = await import(toURL(join(srcDir, 'data/questions/physics.js')));
const { BIO } = await import(toURL(join(srcDir, 'data/questions/biology.js')));
const { CHEM } = await import(toURL(join(srcDir, 'data/questions/chemistry.js')));
const { WH } = await import(toURL(join(srcDir, 'data/questions/world_history.js')));
const { INFO } = await import(toURL(join(srcDir, 'data/questions/informatics.js')));
const { LAW } = await import(toURL(join(srcDir, 'data/questions/law.js')));
const { LIT } = await import(toURL(join(srcDir, 'data/questions/literature.js')));
const { TOPIC_MAP } = await import(toURL(join(srcDir, 'config/topics.js')));

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_KEY env vars');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Map subject ID to array
const POOLS = {
  math: MQ,
  history: HQ,
  geography: GEO,
  english: ENG,
  math_profile: MPQ,
  physics: PHYS,
  biology: BIO,
  chemistry: CHEM,
  world_history: WH,
  informatics: INFO,
  law: LAW,
  literature: LIT,
};

// Find topic for a question index within a subject
function findTopic(sid, idx) {
  const topics = TOPIC_MAP[sid];
  if (!topics) return null;
  for (const t of topics) {
    for (const [start, end] of t.ranges) {
      if (idx >= start && idx <= end) return t.id;
    }
  }
  return null;
}

async function seed() {
  // Clear existing static data
  console.log('Clearing existing static questions...');
  const { error: delErr } = await supabase.from('questions').delete().neq('source', '_keep_');
  if (delErr) {
    console.error('Delete error:', delErr.message);
    process.exit(1);
  }

  const rows = [];

  // Regular subjects (not reading)
  for (const [sid, pool] of Object.entries(POOLS)) {
    for (let i = 0; i < pool.length; i++) {
      const q = pool[i];
      rows.push({
        subject: sid,
        idx: i,
        topic: findTopic(sid, i),
        q: q.q,
        o: q.o,
        c: q.c,
        e: q.e || '',
        passage_group: null,
        passage_title: null,
        passage_text: null,
        source: 'static',
      });
    }
  }

  // Reading passages: flatten to individual questions
  for (let pi = 0; pi < RP.length; pi++) {
    const passage = RP[pi];
    for (let qi = 0; qi < passage.qs.length; qi++) {
      const q = passage.qs[qi];
      const idx = pi * 5 + qi;
      rows.push({
        subject: 'reading',
        idx,
        topic: null,
        q: q.q,
        o: q.o,
        c: q.c,
        e: q.e || '',
        passage_group: pi,
        passage_title: passage.t,
        passage_text: passage.tx,
        source: 'static',
      });
    }
  }

  console.log(`Total rows to insert: ${rows.length}`);

  // Insert in batches of 100
  const BATCH = 100;
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    const { error } = await supabase.from('questions').insert(batch);
    if (error) {
      console.error(`Batch ${i / BATCH + 1} error:`, error.message);
      process.exit(1);
    }
    console.log(`Inserted ${Math.min(i + BATCH, rows.length)} / ${rows.length}`);
  }

  console.log('Seed complete!');
}

seed().catch(err => { console.error(err); process.exit(1); });
