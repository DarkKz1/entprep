// Generate new question types (multiple, matching, context) for all profile subjects
// Runs sequentially to respect rate limits (8000 tokens/min on Tier 1)
//
// Usage:
//   source .env && node scripts/generate-new-types.mjs
//   source .env && node scripts/generate-new-types.mjs --dry-run
//   source .env && node scripts/generate-new-types.mjs --subjects=physics,biology
//   source .env && node scripts/generate-new-types.mjs --resume=chemistry:matching

import { execFile } from 'child_process';
import { promisify } from 'util';
import { createClient } from '@supabase/supabase-js';

const execFileAsync = promisify(execFile);
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// Profile subjects that need new question types
const PROFILE_SUBJECTS = [
  'math_profile', 'physics', 'biology', 'english',
  'chemistry', 'geography', 'world_history', 'informatics', 'law', 'literature',
];

// History gets context questions too
const CONTEXT_SUBJECTS = [...PROFILE_SUBJECTS, 'history'];

const TYPES = ['multiple', 'matching', 'context'];
const COUNT_PER_TYPE = 15; // per subject per type — enough for exam mode (need 5 each)
const PAUSE_BETWEEN_RUNS_MS = 30000; // 30s between runs to respect rate limits

// ── CLI ──────────────────────────────────────────────────────────────────────

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = { dryRun: false, subjects: null, resume: null };
  for (const a of args) {
    if (a === '--dry-run') opts.dryRun = true;
    else if (a.startsWith('--subjects=')) opts.subjects = a.split('=')[1].split(',');
    else if (a.startsWith('--resume=')) opts.resume = a.split('=')[1]; // e.g. "chemistry:matching"
    else if (a === '--help') {
      console.log(`
Usage: source .env && node scripts/generate-new-types.mjs [options]

Options:
  --dry-run               Don't write to Supabase
  --subjects=a,b,...      Only these subjects
  --resume=subject:type   Resume from this subject:type pair

Generates ${COUNT_PER_TYPE} questions of each new type (multiple, matching, context)
for all profile subjects. Runs sequentially with ${PAUSE_BETWEEN_RUNS_MS/1000}s pauses.
`);
      process.exit(0);
    }
  }
  return opts;
}

// ── Run one ingest ───────────────────────────────────────────────────────────

async function runIngest(subject, type, count, dryRun) {
  const args = [
    'scripts/ingest-questions.mjs',
    '--generate',
    `--subject=${subject}`,
    `--type=${type}`,
    `--count=${count}`,
  ];
  if (dryRun) args.push('--dry-run');
  else args.push('--output=supabase');

  try {
    const { stdout, stderr } = await execFileAsync('node', args, {
      env: process.env,
      maxBuffer: 20 * 1024 * 1024,
      timeout: 10 * 60 * 1000, // 10 min
    });

    // Extract key stats
    const lines = (stdout || '').split('\n');
    const inserted = lines.find(l => l.includes('Inserted'))?.trim() || '';
    const passed = lines.find(l => l.includes('Passed:'))?.trim() || '';
    const kept = lines.find(l => l.includes('Kept:'))?.trim() || '';
    const total = lines.find(l => l.includes('Total:'))?.trim() || '';

    return { success: true, inserted, passed, kept, total };
  } catch (e) {
    const msg = (e.stderr || e.message || '').slice(0, 200);
    const isRateLimit = msg.includes('429') || msg.includes('rate_limit');
    const isFatal = msg.includes('credit balance') || msg.includes('authentication');
    return { success: false, error: msg, isRateLimit, isFatal };
  }
}

// ── Check existing counts per type ───────────────────────────────────────────

async function getTypeCounts(supabase) {
  const counts = {};
  for (const subject of [...PROFILE_SUBJECTS, 'history']) {
    counts[subject] = { multiple: 0, matching: 0, context: 0, single: 0 };
    for (const type of ['single', 'multiple', 'matching']) {
      const { count, error } = await supabase
        .from('questions')
        .select('*', { count: 'exact', head: true })
        .eq('subject', subject)
        .eq('type', type);
      if (!error) counts[subject][type] = count || 0;
    }
    // Context = has passage_text + type=single + block=context
    const { count: ctxCount } = await supabase
      .from('questions')
      .select('*', { count: 'exact', head: true })
      .eq('subject', subject)
      .not('passage_text', 'is', null);
    counts[subject].context = ctxCount || 0;
  }
  return counts;
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const opts = parseArgs();

  if (!process.env.ANTHROPIC_API_KEY) { console.error('ANTHROPIC_API_KEY required'); process.exit(1); }
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) { console.error('SUPABASE_URL and SUPABASE_SERVICE_KEY required'); process.exit(1); }

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

  console.log('\n══════════════════════════════════════════════════');
  console.log('  ENTprep New Question Types Generator');
  console.log(`  Types: ${TYPES.join(', ')} | ${COUNT_PER_TYPE} each`);
  console.log(`  Dry run: ${opts.dryRun}`);
  console.log('══════════════════════════════════════════════════\n');

  // Build task list
  const tasks = [];
  for (const type of TYPES) {
    const subjects = type === 'context' ? CONTEXT_SUBJECTS : PROFILE_SUBJECTS;
    const filtered = opts.subjects ? subjects.filter(s => opts.subjects.includes(s)) : subjects;
    for (const subject of filtered) {
      tasks.push({ subject, type, count: COUNT_PER_TYPE });
    }
  }

  // Handle --resume
  if (opts.resume) {
    const [rSubject, rType] = opts.resume.split(':');
    const idx = tasks.findIndex(t => t.subject === rSubject && t.type === rType);
    if (idx >= 0) {
      tasks.splice(0, idx);
      console.log(`Resuming from ${rSubject}:${rType} (${tasks.length} tasks remaining)\n`);
    } else {
      console.error(`Resume point ${opts.resume} not found`);
      process.exit(1);
    }
  }

  console.log(`${tasks.length} tasks to run:\n`);

  const results = [];
  const startTime = Date.now();

  for (let i = 0; i < tasks.length; i++) {
    const { subject, type, count } = tasks[i];
    const label = `[${i + 1}/${tasks.length}] ${subject} × ${type} × ${count}`;
    console.log(`${label}...`);

    const result = await runIngest(subject, type, count, opts.dryRun);

    if (result.success) {
      console.log(`  ✓ ${result.inserted || result.total || 'done'}`);
      results.push({ subject, type, status: 'ok' });
    } else if (result.isFatal) {
      console.error(`  ✗ FATAL: ${result.error}`);
      console.error('\nAborting — check credits/auth.');
      results.push({ subject, type, status: 'fatal' });
      break;
    } else if (result.isRateLimit) {
      console.log(`  ⏳ Rate limited — waiting 60s and retrying...`);
      await sleep(60000);
      const retry = await runIngest(subject, type, count, opts.dryRun);
      if (retry.success) {
        console.log(`  ✓ (retry) ${retry.inserted || retry.total || 'done'}`);
        results.push({ subject, type, status: 'ok' });
      } else {
        console.error(`  ✗ Failed after retry: ${retry.error?.slice(0, 100)}`);
        results.push({ subject, type, status: 'error' });
      }
    } else {
      console.error(`  ✗ ${result.error?.slice(0, 100)}`);
      results.push({ subject, type, status: 'error' });
    }

    // Pause between runs
    if (i < tasks.length - 1) {
      console.log(`  (waiting ${PAUSE_BETWEEN_RUNS_MS / 1000}s...)\n`);
      await sleep(PAUSE_BETWEEN_RUNS_MS);
    }
  }

  // Report
  const elapsed = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
  const ok = results.filter(r => r.status === 'ok').length;
  const failed = results.filter(r => r.status !== 'ok').length;

  console.log('\n══════════════════════════════════════════════════');
  console.log(`  Done in ${elapsed} min | ${ok} ok, ${failed} failed`);
  console.log('══════════════════════════════════════════════════\n');

  if (failed > 0) {
    console.log('Failed tasks:');
    for (const r of results.filter(r => r.status !== 'ok')) {
      console.log(`  - ${r.subject}:${r.type} (${r.status})`);
    }
    const lastOk = results.filter(r => r.status === 'ok').pop();
    const firstFail = results.find(r => r.status !== 'ok');
    if (firstFail) {
      console.log(`\nTo resume: node scripts/generate-new-types.mjs --resume=${firstFail.subject}:${firstFail.type}`);
    }
  }

  // Final counts
  if (!opts.dryRun) {
    console.log('\nFinal counts per type:');
    const counts = await getTypeCounts(supabase);
    console.log('Subject          | single | multiple | matching | context');
    console.log('-'.repeat(62));
    for (const [subject, c] of Object.entries(counts)) {
      console.log(`${subject.padEnd(16)} | ${String(c.single).padStart(6)} | ${String(c.multiple).padStart(8)} | ${String(c.matching).padStart(8)} | ${String(c.context).padStart(7)}`);
    }
  }
}

main().catch(e => {
  console.error(`Fatal: ${e.message}`);
  process.exit(1);
});
