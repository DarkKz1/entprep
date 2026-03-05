#!/usr/bin/env node
/**
 * Show Kazakh translation progress for all subjects.
 *
 * Usage:
 *   SUPABASE_URL=x SUPABASE_SERVICE_KEY=y node scripts/translate-progress.mjs
 */

import { createClient } from '@supabase/supabase-js';
import { VALID_SUBJECTS, SUBJECT_NAMES } from './utils/constants.mjs';

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_SERVICE_KEY;
if (!url || !key) {
  console.error('Error: SUPABASE_URL and SUPABASE_SERVICE_KEY required');
  process.exit(1);
}

const sb = createClient(url, key);

async function main() {
  const rows = [];
  let grandTotal = 0;
  let grandTranslated = 0;

  for (const subject of VALID_SUBJECTS) {
    const { count: total } = await sb
      .from('questions')
      .select('*', { count: 'exact', head: true })
      .eq('subject', subject);

    const { count: translated } = await sb
      .from('questions')
      .select('*', { count: 'exact', head: true })
      .eq('subject', subject)
      .not('q_kk', 'is', null);

    const t = total || 0;
    const tr = translated || 0;
    const remaining = t - tr;
    const pct = t > 0 ? Math.round(tr / t * 100) : 0;

    rows.push({ subject, name: SUBJECT_NAMES[subject] || subject, total: t, translated: tr, remaining, pct });
    grandTotal += t;
    grandTranslated += tr;
  }

  // Print table
  const pad = (s, n) => String(s).padEnd(n);
  const padR = (s, n) => String(s).padStart(n);

  console.log(`\n${pad('Subject', 18)} ${pad('Name', 30)} ${padR('Total', 6)} ${padR('Translated', 11)} ${padR('Remaining', 10)} ${padR('%', 5)}`);
  console.log('─'.repeat(85));

  for (const r of rows) {
    const bar = r.pct > 0 ? '█'.repeat(Math.max(1, Math.round(r.pct / 5))) : '';
    console.log(
      `${pad(r.subject, 18)} ${pad(r.name, 30)} ${padR(r.total, 6)} ${padR(r.translated, 11)} ${padR(r.remaining, 10)} ${padR(r.pct + '%', 5)} ${bar}`
    );
  }

  console.log('─'.repeat(85));
  const grandPct = grandTotal > 0 ? Math.round(grandTranslated / grandTotal * 100) : 0;
  console.log(
    `${pad('TOTAL', 18)} ${pad('', 30)} ${padR(grandTotal, 6)} ${padR(grandTranslated, 11)} ${padR(grandTotal - grandTranslated, 10)} ${padR(grandPct + '%', 5)}`
  );
  console.log();
}

main().catch(err => { console.error(err); process.exit(1); });
