#!/usr/bin/env node
/**
 * Import Kazakh translations into Supabase.
 *
 * Usage:
 *   SUPABASE_URL=x SUPABASE_SERVICE_KEY=y node scripts/translate-import.mjs translations/math_batch_001_kk.json --subject=math
 *   SUPABASE_URL=x SUPABASE_SERVICE_KEY=y node scripts/translate-import.mjs translations/math_batch_001_kk.json --subject=math --dry-run
 *
 * Input format (same structure as export, with _kk fields added):
 * [
 *   { "id": 123, "q_kk": "...", "o_kk": ["..."], "e_kk": "..." },
 *   { "id": 456, "q_kk": "...", "o_kk": ["..."], "e_kk": "...", "type": "multiple" },
 *   { "id": 789, "q_kk": "...", "pairs_kk": [["...", "..."]], "e_kk": "...", "type": "matching" }
 * ]
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { VALID_SUBJECTS, SUBJECT_NAMES } from './utils/constants.mjs';

const file = process.argv[2];
const args = Object.fromEntries(
  process.argv.slice(3).map(a => {
    const [k, v] = a.replace(/^--/, '').split('=');
    return [k, v ?? true];
  })
);

const subject = args.subject;
const dryRun = !!args['dry-run'];

if (!file || !subject || !VALID_SUBJECTS.includes(subject)) {
  console.error('Usage: node translate-import.mjs <file.json> --subject=<id> [--dry-run]');
  process.exit(1);
}

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_SERVICE_KEY;
if (!url || !key) {
  console.error('Error: SUPABASE_URL and SUPABASE_SERVICE_KEY required');
  process.exit(1);
}

const sb = createClient(url, key);

function validate(items) {
  const errors = [];
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const label = `[${i}] id=${item.id}`;

    if (!item.id) {
      errors.push(`${label}: missing id`);
      continue;
    }
    if (!item.q_kk || item.q_kk.trim().length < 5) {
      errors.push(`${label}: q_kk too short or missing`);
    }
    if (!item.e_kk || item.e_kk.trim().length < 10) {
      errors.push(`${label}: e_kk too short or missing`);
    }

    const qType = item.type || 'single';
    if (qType === 'matching') {
      if (!Array.isArray(item.pairs_kk) || item.pairs_kk.length !== 5) {
        errors.push(`${label}: matching must have pairs_kk with 5 pairs`);
      } else {
        for (let j = 0; j < item.pairs_kk.length; j++) {
          if (!Array.isArray(item.pairs_kk[j]) || item.pairs_kk[j].length !== 2) {
            errors.push(`${label}: pairs_kk[${j}] must be [left, right]`);
          }
        }
      }
    } else {
      const expectedLen = qType === 'multiple' ? 6 : 4;
      if (!Array.isArray(item.o_kk) || item.o_kk.length !== expectedLen) {
        errors.push(`${label}: o_kk must have ${expectedLen} options, got ${item.o_kk?.length || 0}`);
      }
    }
  }
  return errors;
}

async function main() {
  let items;
  try {
    items = JSON.parse(readFileSync(file, 'utf8'));
  } catch (err) {
    console.error(`Cannot read ${file}:`, err.message);
    process.exit(1);
  }

  if (!Array.isArray(items) || items.length === 0) {
    console.error('File must contain a non-empty JSON array');
    process.exit(1);
  }

  console.log(`${SUBJECT_NAMES[subject] || subject}: ${items.length} переводов в ${file}`);

  // Validate
  const errors = validate(items);
  if (errors.length > 0) {
    console.error(`\nОшибки валидации (${errors.length}):`);
    errors.forEach(e => console.error(`  ✗ ${e}`));
    process.exit(1);
  }
  console.log('Валидация: OK\n');

  if (dryRun) {
    console.log('--dry-run: пропуск записи в Supabase');
    items.forEach(item => {
      console.log(`  id=${item.id}: q_kk="${item.q_kk?.substring(0, 60)}..."`);
    });
    return;
  }

  // Update Supabase in batches
  const BATCH = 100;
  let updated = 0;
  let failed = 0;

  for (let i = 0; i < items.length; i += BATCH) {
    const batch = items.slice(i, i + BATCH);
    const results = await Promise.allSettled(
      batch.map(item => {
        const update = { q_kk: item.q_kk, e_kk: item.e_kk };
        const qType = item.type || 'single';
        if (qType === 'matching') {
          update.pairs_kk = item.pairs_kk;
        } else {
          update.o_kk = item.o_kk;
        }
        if (item.passage_title_kk) update.passage_title_kk = item.passage_title_kk;
        if (item.passage_text_kk) update.passage_text_kk = item.passage_text_kk;

        return sb
          .from('questions')
          .update(update)
          .eq('id', item.id);
      })
    );

    for (const r of results) {
      if (r.status === 'fulfilled' && !r.value.error) {
        updated++;
      } else {
        failed++;
        const err = r.status === 'rejected' ? r.reason : r.value.error?.message;
        console.error(`  ✗ Ошибка: ${err}`);
      }
    }

    if (i + BATCH < items.length) {
      process.stdout.write(`  ${Math.min(i + BATCH, items.length)}/${items.length}...\r`);
    }
  }

  console.log(`\nГотово: ${updated} обновлено, ${failed} ошибок`);
}

main().catch(err => { console.error(err); process.exit(1); });
