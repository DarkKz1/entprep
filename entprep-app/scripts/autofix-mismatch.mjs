/**
 * Auto-fix answer-mismatch questions.
 * Parses explanation to find the real correct answer, updates `c` in Supabase.
 *
 * Usage:
 *   node scripts/autofix-mismatch.mjs              # dry run (default)
 *   node scripts/autofix-mismatch.mjs --commit      # apply fixes
 *   node scripts/autofix-mismatch.mjs --subject=math # single subject
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { checkExplanationMismatch } from './utils/quality.mjs';

// ── Load env ──────────────────────────────────────────────────────────────────
const env = readFileSync('.env', 'utf8');
env.split('\n').forEach(l => {
  const [k, ...v] = l.split('=');
  if (k && !k.startsWith('#')) process.env[k.trim()] = v.join('=').trim();
});

const commit = process.argv.includes('--commit');
const subjectArg = process.argv.find(a => a.startsWith('--subject='))?.split('=')[1];

const sb = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY,
);

const SUBJECTS = subjectArg ? [subjectArg] : [
  'math', 'reading', 'history', 'physics', 'biology', 'math_profile',
  'english', 'chemistry', 'geography', 'world_history', 'informatics', 'law', 'literature',
];

// ── Extract core value (same logic as quality.mjs) ────────────────────────────
function extractCore(text) {
  return (text || '').toLowerCase()
    .replace(/\s*(м²|м³|км²|км|см|мм|кг|г|л|мл|с|мин|ч|°c|°|%|тг|₸|руб|тенге)\s*/gi, '')
    .replace(/[.,!?;:()«»"'\-—–]/g, '')
    .trim();
}

// ── Try to find the real correct option from explanation ───────────────────────
function findCorrectFromExplanation(options, explanation) {
  const expLower = explanation.toLowerCase();

  // Strategy 1: "= VALUE" pattern — last equation result is the answer
  const eqMatches = explanation.match(/[=≈]\s*([\d\s.,]+)/g);
  if (eqMatches) {
    const lastEq = eqMatches[eqMatches.length - 1];
    const eqValue = lastEq.replace(/[=≈\s.,]/g, '').trim();
    if (eqValue.length >= 2) {
      for (let i = 0; i < options.length; i++) {
        const core = extractCore(options[i]);
        if (core.includes(eqValue) || eqValue.includes(core)) {
          return { idx: i, method: 'eq-pattern', match: lastEq.trim() };
        }
      }
    }
  }

  // Strategy 2: which option's core text appears in explanation (but skip the current correct)
  const scores = [];
  for (let i = 0; i < options.length; i++) {
    const core = extractCore(options[i]);
    if (core.length < 2) { scores.push(0); continue; }
    // Count how many times core appears in explanation
    let count = 0;
    let pos = 0;
    while ((pos = expLower.indexOf(core, pos)) !== -1) { count++; pos += core.length; }
    scores.push(count);
  }

  // Pick option with most mentions (must be unique winner)
  const maxScore = Math.max(...scores);
  if (maxScore > 0) {
    const winners = scores.reduce((acc, s, i) => s === maxScore ? [...acc, i] : acc, []);
    if (winners.length === 1) {
      return { idx: winners[0], method: 'text-match', match: extractCore(options[winners[0]]) };
    }
  }

  return null; // Can't determine
}

// ── Main ──────────────────────────────────────────────────────────────────────
let totalFixed = 0;
let totalSkipped = 0;
let totalErrors = 0;

for (const subject of SUBJECTS) {
  // Fetch all questions (paginated, 1000 at a time)
  let allRows = [];
  let from = 0;
  const PAGE = 1000;
  while (true) {
    const { data, error } = await sb.from('questions')
      .select('id,idx,q,o,c,e,type')
      .eq('subject', subject)
      .order('idx')
      .range(from, from + PAGE - 1);
    if (error) { console.error(`Error fetching ${subject}:`, error.message); break; }
    if (!data || data.length === 0) break;
    allRows.push(...data);
    if (data.length < PAGE) break;
    from += PAGE;
  }

  // Find mismatches
  const mismatches = [];
  for (const row of allRows) {
    if (row.type && row.type !== 'single') continue;
    if (!row.e || !Array.isArray(row.o)) continue;
    const issue = checkExplanationMismatch(row.q, row.o, row.c, row.e);
    if (issue) mismatches.push(row);
  }

  if (mismatches.length === 0) continue;

  console.log(`\n${subject}: ${mismatches.length} mismatches`);

  for (const row of mismatches) {
    const result = findCorrectFromExplanation(row.o, row.e);
    if (!result) {
      console.log(`  SKIP [idx ${row.idx}] "${row.q.slice(0, 60)}..." — can't determine correct`);
      totalSkipped++;
      continue;
    }

    if (result.idx === row.c) {
      // False positive — the detected answer is the same as current c
      continue;
    }

    const oldAnswer = row.o[row.c];
    const newAnswer = row.o[result.idx];
    console.log(`  FIX  [idx ${row.idx}] c: ${row.c}→${result.idx} | "${oldAnswer}" → "${newAnswer}" (${result.method}: ${result.match})`);

    if (commit) {
      const { error } = await sb.from('questions').update({ c: result.idx }).eq('id', row.id);
      if (error) {
        console.log(`    ERROR: ${error.message}`);
        totalErrors++;
      } else {
        totalFixed++;
      }
    } else {
      totalFixed++;
    }
  }
}

console.log(`\n${'='.repeat(50)}`);
console.log(`${commit ? 'COMMITTED' : 'DRY RUN'}: ${totalFixed} fixed, ${totalSkipped} skipped, ${totalErrors} errors`);
if (!commit && totalFixed > 0) {
  console.log(`\nRun with --commit to apply fixes.`);
}
