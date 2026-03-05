// Bulk insert questions from a JSON file into Supabase
// Usage: node scripts/_bulk-insert.mjs <file.json>
// JSON format: [{ q, o, c, e, subject, topic, subtopic, difficulty, type?, block?, correct_indices?, pairs? }, ...]

import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envFile = readFileSync(join(__dirname, '..', '.env'), 'utf-8');
const env = {};
for (const line of envFile.split(/\r?\n/)) {
  const m = line.match(/^([A-Z_]+)=(.+)/);
  if (m) env[m[1]] = m[2].replace(/\r/g, '').trim();
}

const SB_URL = env.SUPABASE_URL;
const SB_KEY = env.SUPABASE_SERVICE_KEY;
if (!SB_URL || !SB_KEY) { console.error('Missing env vars'); process.exit(1); }

const file = process.argv[2];
if (!file) { console.error('Usage: node _bulk-insert.mjs <file.json>'); process.exit(1); }

const questions = JSON.parse(readFileSync(file, 'utf-8'));
console.log(`Loaded ${questions.length} questions from ${file}`);

// Get max idx for each subject
const subjects = [...new Set(questions.map(q => q.subject))];
const maxIdx = {};
for (const s of subjects) {
  const r = await fetch(`${SB_URL}/rest/v1/questions?subject=eq.${s}&select=idx&order=idx.desc&limit=1`, {
    headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` }
  });
  const data = await r.json();
  maxIdx[s] = (data[0]?.idx || 0) + 1;
}

// Validate
let errors = 0;
for (let i = 0; i < questions.length; i++) {
  const q = questions[i];
  const errs = [];
  if (!q.q || q.q.length < 5) errs.push('q too short');
  if (!q.e || q.e.length < 10) errs.push('e too short');
  if (!q.subject) errs.push('no subject');
  if (!q.topic) errs.push('no topic');

  const type = q.type || 'single';
  if (type === 'single') {
    if (!Array.isArray(q.o) || q.o.length !== 4) errs.push('need 4 options');
    if (typeof q.c !== 'number' || q.c < 0 || q.c > 3) errs.push('c must be 0-3');
    if (q.o && new Set(q.o).size !== q.o.length) errs.push('duplicate options');
  } else if (type === 'multiple') {
    if (!Array.isArray(q.o) || q.o.length !== 6) errs.push('need 6 options');
    if (!Array.isArray(q.correct_indices) || q.correct_indices.length < 2 || q.correct_indices.length > 3) errs.push('need 2-3 correct_indices');
  } else if (type === 'matching') {
    if (!Array.isArray(q.pairs) || q.pairs.length !== 5) errs.push('need 5 pairs');
  }

  if (errs.length) {
    console.error(`  [${i}] INVALID: ${errs.join(', ')} — "${q.q?.slice(0, 50)}..."`);
    errors++;
  }
}

if (errors > 0) {
  console.error(`\n${errors} invalid questions. Fix and retry.`);
  process.exit(1);
}

// Map difficulty: A/B/C → easy/medium/hard
const DIFF_MAP = { A: 'easy', B: 'medium', C: 'hard', easy: 'easy', medium: 'medium', hard: 'hard' };

// Build rows
const rows = questions.map(q => {
  const type = q.type || 'single';
  const rawDiff = q.difficulty || null;
  const row = {
    idx: maxIdx[q.subject]++,
    subject: q.subject,
    q: q.q,
    o: type === 'matching' ? [] : q.o,
    c: type === 'single' ? q.c : 0,
    e: q.e,
    topic: q.topic,
    subtopic: q.subtopic || null,
    type,
    block: q.block || type,
    difficulty: rawDiff ? (DIFF_MAP[rawDiff] || null) : null,
    source: 'generated',
  };
  if (type === 'multiple') row.correct_indices = q.correct_indices;
  if (type === 'matching') row.pairs = q.pairs;
  return row;
});

// Insert in batches of 100
let inserted = 0;
const BATCH = 100;
for (let i = 0; i < rows.length; i += BATCH) {
  const batch = rows.slice(i, i + BATCH);
  const r = await fetch(`${SB_URL}/rest/v1/questions`, {
    method: 'POST',
    headers: {
      apikey: SB_KEY,
      Authorization: `Bearer ${SB_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify(batch),
  });
  if (!r.ok) {
    const text = await r.text();
    console.error(`  Insert failed at batch ${i}: ${text}`);
    process.exit(1);
  }
  inserted += batch.length;
  console.log(`  Inserted ${inserted}/${rows.length}`);
}

console.log(`\nDone! Inserted ${inserted} questions.`);
