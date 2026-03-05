#!/usr/bin/env node
/**
 * Export untranslated questions for Kazakh translation.
 *
 * Usage:
 *   SUPABASE_URL=x SUPABASE_SERVICE_KEY=y node scripts/translate-export.mjs --subject=math --count=50
 *   SUPABASE_URL=x SUPABASE_SERVICE_KEY=y node scripts/translate-export.mjs --subject=math --count=50 --offset=100
 *
 * Output: translations/{subject}_batch_{N}.json
 */

import { createClient } from '@supabase/supabase-js';
import { writeFileSync, readdirSync } from 'fs';
import { VALID_SUBJECTS, SUBJECT_NAMES } from './utils/constants.mjs';

const args = Object.fromEntries(
  process.argv.slice(2).map(a => {
    const [k, v] = a.replace(/^--/, '').split('=');
    return [k, v ?? true];
  })
);

const subject = args.subject;
const count = parseInt(args.count || '50', 10);
const offset = parseInt(args.offset || '0', 10);

if (!subject || !VALID_SUBJECTS.includes(subject)) {
  console.error(`Usage: --subject=<${VALID_SUBJECTS.join('|')}> --count=N [--offset=N]`);
  process.exit(1);
}

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_SERVICE_KEY;
if (!url || !key) {
  console.error('Error: SUPABASE_URL and SUPABASE_SERVICE_KEY required');
  process.exit(1);
}

const sb = createClient(url, key);

async function main() {
  // Get total and translated counts
  const { count: total } = await sb
    .from('questions')
    .select('*', { count: 'exact', head: true })
    .eq('subject', subject);

  const { count: translated } = await sb
    .from('questions')
    .select('*', { count: 'exact', head: true })
    .eq('subject', subject)
    .not('q_kk', 'is', null);

  const remaining = (total || 0) - (translated || 0);
  console.log(`${SUBJECT_NAMES[subject] || subject}: ${translated || 0}/${total || 0} переведено, ${remaining} осталось\n`);

  if (remaining === 0) {
    console.log('Все вопросы уже переведены!');
    return;
  }

  // Fetch untranslated questions
  const { data, error } = await sb
    .from('questions')
    .select('id,idx,q,o,e,type,correct_indices,pairs,passage_title,passage_text')
    .eq('subject', subject)
    .is('q_kk', null)
    .order('idx', { ascending: true })
    .range(offset, offset + count - 1);

  if (error) {
    console.error('Supabase error:', error.message);
    process.exit(1);
  }

  if (!data || data.length === 0) {
    console.log('Нет вопросов для экспорта (offset может быть слишком большим)');
    return;
  }

  // Format output
  const output = data.map(row => {
    const qType = row.type || 'single';
    const item = { id: row.id, idx: row.idx, q: row.q, e: row.e, type: qType };

    if (qType === 'matching' && row.pairs) {
      item.pairs = row.pairs;
    } else {
      item.o = row.o;
    }

    if (qType === 'multiple' && row.correct_indices) {
      item.correct_indices = row.correct_indices;
    }

    // Reading passages
    if (row.passage_title) item.passage_title = row.passage_title;
    if (row.passage_text) item.passage_text = row.passage_text;

    return item;
  });

  // Determine batch number
  let batchNum = 1;
  try {
    const existing = readdirSync('translations')
      .filter(f => f.startsWith(`${subject}_batch_`) && f.endsWith('.json'))
      .map(f => parseInt(f.match(/_batch_(\d+)/)?.[1] || '0', 10))
      .filter(n => n > 0);
    if (existing.length > 0) batchNum = Math.max(...existing) + 1;
  } catch {}

  const filename = `translations/${subject}_batch_${String(batchNum).padStart(3, '0')}.json`;
  writeFileSync(filename, JSON.stringify(output, null, 2), 'utf8');

  console.log(`Экспортировано ${output.length} вопросов → ${filename}`);
  console.log(`\nСледующий шаг: перевести и сохранить как ${filename.replace('.json', '_kk.json')}`);
}

main().catch(err => { console.error(err); process.exit(1); });
