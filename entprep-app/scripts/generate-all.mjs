// ENTprep Bulk Question Generator — orchestrates ingest-questions.mjs for all 13 subjects
// Usage:
//   ANTHROPIC_API_KEY=xxx SUPABASE_URL=yyy SUPABASE_SERVICE_KEY=zzz \
//     node scripts/generate-all.mjs --target=500
//   node scripts/generate-all.mjs --target=500 --dry-run
//   node scripts/generate-all.mjs --target=500 --subjects=physics,math
//   node scripts/generate-all.mjs --help

import { execFile } from 'child_process';
import { promisify } from 'util';
import { createClient } from '@supabase/supabase-js';
import { VALID_SUBJECTS } from './utils/constants.mjs';
import { ENT_SPECS, distributeBySpec, DIFFICULTY } from './utils/ent-specs.mjs';

const execFileAsync = promisify(execFile);

// ── Config ──────────────────────────────────────────────────────────────────

// Ordered by priority: mandatory first, then popular profiles, then rest
const ALL_SUBJECTS = [
  'math', 'reading', 'history',
  'math_profile', 'physics', 'biology', 'english',
  'chemistry', 'geography', 'world_history', 'informatics', 'law', 'literature',
];

// Validate all subjects exist in the canonical list
const invalid = ALL_SUBJECTS.filter(s => !VALID_SUBJECTS.includes(s));
if (invalid.length > 0) {
  console.error(`ERROR: ALL_SUBJECTS contains unknown subjects: ${invalid.join(', ')}`);
  console.error(`Valid subjects: ${VALID_SUBJECTS.join(', ')}`);
  process.exit(1);
}

const GENERATE_RATIO = 0.70; // 70% new generation, 30% rephrase
const PAUSE_BETWEEN_SUBJECTS_MS = 3000;
const BATCH_PER_CALL = 50; // max questions per subprocess call
const BATCH_PER_CALL_READING = 10; // reading passages are ~5x larger (each has 5 questions)

// ── CLI ─────────────────────────────────────────────────────────────────────

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = { target: 500, dryRun: false, skipVerify: false, subjects: null, model: 'sonnet', help: false };

  for (const a of args) {
    if (a === '--help' || a === '-h') opts.help = true;
    else if (a === '--dry-run') opts.dryRun = true;
    else if (a === '--skip-verify') opts.skipVerify = true;
    else if (a.startsWith('--target=')) opts.target = parseInt(a.split('=')[1], 10);
    else if (a.startsWith('--subjects=')) opts.subjects = a.split('=')[1].split(',');
    else if (a.startsWith('--model=')) opts.model = a.split('=')[1];
    else console.warn(`Unknown arg: ${a}`);
  }

  return opts;
}

function printHelp() {
  console.log(`
ENTprep Bulk Question Generator

Usage:
  node scripts/generate-all.mjs --target=500 [options]

Options:
  --target=<n>          Target questions per subject (default: 500)
  --subjects=<a,b,...>  Only process these subjects (comma-separated)
  --model=<model>       AI model alias (default: sonnet)
  --dry-run             Dry run mode (no Supabase writes)
  --help                Show this help

Environment variables:
  ANTHROPIC_API_KEY     Required for Claude models
  SUPABASE_URL          Required (reads current counts)
  SUPABASE_SERVICE_KEY  Required (reads current counts)

Example:
  ANTHROPIC_API_KEY=xxx SUPABASE_URL=yyy SUPABASE_SERVICE_KEY=zzz \\
    node scripts/generate-all.mjs --target=500
`);
}

// ── Supabase count check ────────────────────────────────────────────────────

async function getSubjectCounts(supabase) {
  const counts = {};
  for (const subject of ALL_SUBJECTS) {
    const { count, error } = await supabase
      .from('questions')
      .select('*', { count: 'exact', head: true })
      .eq('subject', subject);

    if (error) {
      console.warn(`  Warning: could not count ${subject}: ${error.message}`);
      counts[subject] = 0;
    } else {
      counts[subject] = count || 0;
    }
  }
  return counts;
}

// Get per-subtopic counts for a subject from Supabase
async function getSubtopicCounts(supabase, subject) {
  const { data, error } = await supabase
    .from('questions')
    .select('topic, subtopic')
    .eq('subject', subject);
  if (error) { console.warn(`  Warning: could not get subtopic counts for ${subject}`); return {}; }

  const counts = {};
  for (const row of data) {
    const key = row.subtopic || row.topic || '(none)';
    counts[key] = (counts[key] || 0) + 1;
  }
  return counts;
}

/**
 * Build a subtopic-level gap-fill plan for a subject.
 * Returns array of { sectionId, sectionName, subtopicId, subtopicName, gap, target, current }
 * sorted by gap descending (biggest gaps first).
 */
function buildSubtopicPlan(spec, totalTarget, subtopicCounts) {
  const totalCurrent = Object.values(subtopicCounts).reduce((s, v) => s + v, 0);
  const totalDelta = Math.max(0, totalTarget - totalCurrent);
  if (totalDelta === 0) return [];

  // Calculate target per subtopic:
  // section_target = totalTarget * section.weight
  // subtopic_target = section_target / num_subtopics_in_section
  const items = [];
  for (const section of spec.sections) {
    const sectionTarget = Math.round(totalTarget * section.weight);
    const numSt = section.topics.length;
    if (numSt === 0) continue;
    const stTarget = Math.round(sectionTarget / numSt);

    for (const topic of section.topics) {
      const current = subtopicCounts[topic.id] || 0;
      const gap = Math.max(0, stTarget - current);
      items.push({
        sectionId: section.id,
        sectionName: section.name,
        subtopicId: topic.id,
        subtopicName: topic.name,
        target: stTarget,
        current,
        gap,
      });
    }
  }

  // Scale gaps so they sum to totalDelta
  const rawGapSum = items.reduce((s, i) => s + i.gap, 0);
  if (rawGapSum === 0) return [];

  let assigned = 0;
  for (let i = 0; i < items.length; i++) {
    if (i === items.length - 1) {
      items[i].gap = totalDelta - assigned;
    } else {
      items[i].gap = Math.round((items[i].gap / rawGapSum) * totalDelta);
      assigned += items[i].gap;
    }
  }

  // Filter out zero gaps, sort by gap descending
  return items.filter(i => i.gap > 0).sort((a, b) => b.gap - a.gap);
}

// ── Run ingest-questions.mjs as subprocess ──────────────────────────────────

async function runIngest(mode, subject, count, opts, difficulty, topic, subtopic) {
  const args = [
    'scripts/ingest-questions.mjs',
    `--${mode}`,
    `--subject=${subject}`,
    `--count=${count}`,
    `--model=${opts.model}`,
  ];
  if (difficulty) args.push(`--difficulty=${difficulty}`);
  if (topic) args.push(`--topic=${topic}`);
  if (subtopic) args.push(`--subtopic=${subtopic}`);
  if (opts.dryRun) args.push('--dry-run');
  if (opts.skipVerify) args.push('--skip-verify');

  const env = { ...process.env };
  const topicLabel = topic ? ` (${topic})` : '';
  const label = `${mode} ${subject} x${count}${difficulty ? ` [${difficulty}]` : ''}${topicLabel}`;
  console.log(`  > node ${args.join(' ')}`);

  try {
    const { stdout, stderr } = await execFileAsync('node', args, {
      env,
      maxBuffer: 20 * 1024 * 1024,
      timeout: 10 * 60 * 1000, // 10 min per batch
    });
    if (stdout) {
      const lines = stdout.split('\n');
      const summaryLines = lines.filter(l =>
        l.includes('Acquired:') || l.includes('Passed:') ||
        l.includes('Kept:') || l.includes('Inserted') ||
        l.includes('Pipeline complete') || l.includes('Total:') ||
        l.includes('REJECTED') || l.includes('Removed')
      );
      for (const line of summaryLines) console.log(`    ${line.trim()}`);
    }
    if (stderr) console.warn(`    stderr: ${stderr.trim()}`);
    return { success: true, label };
  } catch (e) {
    // Extract stderr from error for better diagnostics
    const stderr = e.stderr ? e.stderr.trim() : '';
    const detail = stderr || e.message.slice(0, 200);
    console.error(`    FAILED [${label}]: ${detail}`);
    const isFatal = detail.includes('credit balance') || detail.includes('authentication');
    return { success: false, label, error: detail, fatal: isFatal };
  }
}

// Run ingest in batches of BATCH_PER_CALL to avoid subprocess timeout
async function runIngestBatched(mode, subject, totalCount, opts, difficulty, topic, subtopic) {
  let remaining = totalCount;
  let allSuccess = true;
  const batchSize = subject === 'reading' ? BATCH_PER_CALL_READING : BATCH_PER_CALL;

  while (remaining > 0) {
    const batchCount = Math.min(batchSize, remaining);
    const result = await runIngest(mode, subject, batchCount, opts, difficulty, topic, subtopic);
    if (!result.success) {
      allSuccess = false;
      // Abort immediately on credit/auth errors — no point retrying
      if (result.error && (result.error.includes('credit balance') || result.error.includes('authentication'))) {
        console.error(`    FATAL: API credit/auth error — aborting all generation.`);
        return { success: false, label: `${mode} ${subject} x${totalCount}`, fatal: true, error: result.error };
      }
      console.log(`    (continuing despite error...)`);
    }
    remaining -= batchCount;
    if (remaining > 0) {
      console.log(`    (${remaining} remaining, pausing 2s...)`);
      await sleep(2000);
    }
  }

  return { success: allSuccess, label: `${mode} ${subject} x${totalCount}` };
}

// Official ENT difficulty distribution: A (50%), B (30%), C (20%)
const DIFFICULTY_DISTRIBUTION = [
  { level: 'easy',   share: DIFFICULTY.easy },   // 0.50
  { level: 'medium', share: DIFFICULTY.medium },  // 0.30
  { level: 'hard',   share: DIFFICULTY.hard },    // 0.20
];

function splitByDifficulty(totalCount) {
  const splits = [];
  let assigned = 0;
  for (let i = 0; i < DIFFICULTY_DISTRIBUTION.length; i++) {
    const d = DIFFICULTY_DISTRIBUTION[i];
    const count = i === DIFFICULTY_DISTRIBUTION.length - 1
      ? totalCount - assigned
      : Math.round(totalCount * d.share);
    if (count > 0) {
      splits.push({ difficulty: d.level, count });
      assigned += count;
    }
  }
  return splits;
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const opts = parseArgs();
  if (opts.help) { printHelp(); process.exit(0); }

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('Error: ANTHROPIC_API_KEY env var required');
    process.exit(1);
  }
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
    console.error('Error: SUPABASE_URL and SUPABASE_SERVICE_KEY env vars required');
    process.exit(1);
  }

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
  const subjects = opts.subjects || ALL_SUBJECTS;

  console.log('\n====================================================');
  console.log('  ENTprep Bulk Question Generator');
  console.log(`  Target: ${opts.target} questions per subject`);
  console.log(`  Subjects: ${subjects.join(', ')}`);
  console.log(`  Model: ${opts.model}`);
  console.log(`  Dry run: ${opts.dryRun}`);
  console.log('====================================================\n');

  // Step 1: Check current counts
  console.log('Checking current question counts in Supabase...\n');
  const currentCounts = await getSubjectCounts(supabase);

  const plan = [];
  for (const subject of subjects) {
    const current = currentCounts[subject] || 0;
    let delta = Math.max(0, opts.target - current);
    // Reading: count is in passages (5 questions each), so convert
    if (subject === 'reading') {
      delta = Math.ceil(delta / 5); // e.g., 350 questions → 70 passages
    }
    const generateCount = Math.round(delta * GENERATE_RATIO);
    const rephraseCount = delta - generateCount;
    plan.push({ subject, current, delta, generateCount, rephraseCount, isReading: subject === 'reading' });
  }

  // Print plan table
  console.log('Subject          | Current | Delta | Generate | Rephrase');
  console.log('-'.repeat(62));
  let totalDelta = 0;
  let totalGenerate = 0;
  let totalRephrase = 0;
  for (const p of plan) {
    const name = p.subject.padEnd(16);
    console.log(`${name} | ${String(p.current).padStart(7)} | ${String(p.delta).padStart(5)} | ${String(p.generateCount).padStart(8)} | ${String(p.rephraseCount).padStart(8)}`);
    totalDelta += p.delta;
    totalGenerate += p.generateCount;
    totalRephrase += p.rephraseCount;
  }
  console.log('-'.repeat(62));
  console.log(`${'TOTAL'.padEnd(16)} | ${String(Object.values(currentCounts).reduce((a, b) => a + b, 0)).padStart(7)} | ${String(totalDelta).padStart(5)} | ${String(totalGenerate).padStart(8)} | ${String(totalRephrase).padStart(8)}`);
  console.log('');

  if (totalDelta === 0) {
    console.log('All subjects already at target. Nothing to do.');
    process.exit(0);
  }

  // Step 2: Execute
  const results = [];
  const startTime = Date.now();

  for (let i = 0; i < plan.length; i++) {
    const p = plan[i];
    if (p.delta === 0) {
      console.log(`\n[${i + 1}/${plan.length}] ${p.subject}: already at target (${p.current}). Skipping.`);
      results.push({ subject: p.subject, generated: 0, rephrased: 0, status: 'skipped' });
      continue;
    }

    console.log(`\n[${i + 1}/${plan.length}] ${p.subject}: +${p.delta} needed (${p.generateCount} generate + ${p.rephraseCount} rephrase)`);

    let genResult = { success: true };
    let repResult = { success: true };

    const batchLabel = p.subject === 'reading' ? BATCH_PER_CALL_READING : BATCH_PER_CALL;
    if (p.generateCount > 0) {
      const spec = ENT_SPECS[p.subject];

      if (spec && !p.isReading) {
        // Subtopic-aware gap-fill: query current distribution, fill gaps
        const stCounts = await getSubtopicCounts(supabase, p.subject);
        const stPlan = buildSubtopicPlan(spec, opts.target, stCounts);

        if (stPlan.length > 0) {
          // Scale subtopic gaps to match generateCount (70% of delta)
          const rawGapSum = stPlan.reduce((s, item) => s + item.gap, 0);
          let assigned = 0;
          for (let j = 0; j < stPlan.length; j++) {
            if (j === stPlan.length - 1) {
              stPlan[j].gap = p.generateCount - assigned;
            } else {
              stPlan[j].gap = Math.round((stPlan[j].gap / rawGapSum) * p.generateCount);
              assigned += stPlan[j].gap;
            }
          }

          console.log(`\n  Subtopic gap-fill plan (${stPlan.length} subtopics):`);
          let prevSection = '';
          for (const sp of stPlan) {
            if (sp.sectionName !== prevSection) {
              console.log(`    [${sp.sectionName}]`);
              prevSection = sp.sectionName;
            }
            console.log(`      ${sp.subtopicName.slice(0, 45).padEnd(45)} ${String(sp.current).padStart(4)} → +${sp.gap}`);
          }

          for (const sp of stPlan) {
            if (sp.gap <= 0) continue;
            const dSplits = splitByDifficulty(sp.gap);
            for (const { difficulty, count: dCount } of dSplits) {
              if (dCount === 0) continue;
              console.log(`\n  --- ${sp.subtopicName.slice(0, 35)} | ${dCount}x ${difficulty} ---`);
              genResult = await runIngestBatched('generate', p.subject, dCount, opts, difficulty, sp.sectionId, sp.subtopicId);
              if (genResult.fatal) break;
              await sleep(500);
            }
            if (genResult.fatal) break;
          }
        } else {
          // Fallback: no subtopic plan → old section-level distribution
          const sectionPlan = distributeBySpec(spec, p.generateCount);
          for (const { sectionId, sectionName, count: secCount } of sectionPlan) {
            if (secCount === 0) continue;
            const dSplits = splitByDifficulty(secCount);
            for (const { difficulty, count: dCount } of dSplits) {
              if (dCount === 0) continue;
              console.log(`\n  --- ${sectionName} | ${dCount}x ${difficulty} (batches of ${batchLabel}) ---`);
              genResult = await runIngestBatched('generate', p.subject, dCount, opts, difficulty, sectionId);
              if (genResult.fatal) break;
              await sleep(1000);
            }
            if (genResult.fatal) break;
          }
        }
      } else {
        // Fallback: reading or no spec — generate without section distribution
        const difficultySplits = p.isReading
          ? [{ difficulty: null, count: p.generateCount }]
          : splitByDifficulty(p.generateCount);

        for (const { difficulty, count: dCount } of difficultySplits) {
          const diffLabel = difficulty ? ` [${difficulty}]` : '';
          console.log(`\n  --- Generate ${dCount} new ${p.isReading ? 'passages' : 'questions'}${diffLabel} (batches of ${batchLabel}) ---`);
          genResult = await runIngestBatched('generate', p.subject, dCount, opts, difficulty);
          if (genResult.fatal) break;
          if (difficulty) await sleep(2000);
        }
      }
    }

    // Fatal error — abort everything
    if (genResult.fatal) {
      console.error('\n  ABORTING: Fatal API error (credit/auth). Top up credits and re-run.');
      results.push({ subject: p.subject, generated: 0, rephrased: 0, status: 'fatal' });
      break;
    }

    // Pause between API bursts
    if (p.generateCount > 0 && p.rephraseCount > 0) {
      console.log(`  (pausing ${PAUSE_BETWEEN_SUBJECTS_MS / 1000}s between generate and rephrase...)`);
      await sleep(PAUSE_BETWEEN_SUBJECTS_MS);
    }

    // Rephrase existing questions (batched)
    if (p.rephraseCount > 0) {
      console.log(`\n  --- Rephrase ${p.rephraseCount} existing ${p.isReading ? 'passages' : 'questions'} (batches of ${batchLabel}) ---`);
      repResult = await runIngestBatched('rephrase', p.subject, p.rephraseCount, opts);
    }

    // Fatal error — abort everything
    if (repResult.fatal) {
      console.error('\n  ABORTING: Fatal API error (credit/auth). Top up credits and re-run.');
      results.push({ subject: p.subject, generated: p.generateCount, rephrased: 0, status: 'fatal' });
      break;
    }

    results.push({
      subject: p.subject,
      generated: p.generateCount,
      rephrased: p.rephraseCount,
      status: genResult.success && repResult.success ? 'ok' : 'error',
    });

    // Pause between subjects
    if (i < plan.length - 1 && p.delta > 0) {
      console.log(`\n  (pausing ${PAUSE_BETWEEN_SUBJECTS_MS / 1000}s before next subject...)`);
      await sleep(PAUSE_BETWEEN_SUBJECTS_MS);
    }
  }

  // Step 3: Final report
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);

  console.log('\n\n====================================================');
  console.log('  FINAL REPORT');
  console.log('====================================================\n');

  // Re-check counts if not dry run
  if (!opts.dryRun) {
    const afterCounts = await getSubjectCounts(supabase);
    console.log('Subject          | Before | After  | Generated | Rephrased | Status');
    console.log('-'.repeat(72));
    for (const r of results) {
      const before = currentCounts[r.subject] || 0;
      const after = afterCounts[r.subject] || 0;
      const name = r.subject.padEnd(16);
      console.log(`${name} | ${String(before).padStart(6)} | ${String(after).padStart(6)} | ${String(r.generated).padStart(9)} | ${String(r.rephrased).padStart(9)} | ${r.status}`);
    }
    const totalBefore = Object.values(currentCounts).reduce((a, b) => a + b, 0);
    const totalAfter = Object.values(afterCounts).reduce((a, b) => a + b, 0);
    console.log('-'.repeat(72));
    console.log(`${'TOTAL'.padEnd(16)} | ${String(totalBefore).padStart(6)} | ${String(totalAfter).padStart(6)} | ${String(totalGenerate).padStart(9)} | ${String(totalRephrase).padStart(9)} |`);
  } else {
    console.log('(Dry run — no actual counts to verify)\n');
    console.log('Subject          | Planned Gen | Planned Rep | Status');
    console.log('-'.repeat(60));
    for (const r of results) {
      const name = r.subject.padEnd(16);
      console.log(`${name} | ${String(r.generated).padStart(11)} | ${String(r.rephrased).padStart(11)} | ${r.status}`);
    }
  }

  const failures = results.filter(r => r.status === 'error');
  console.log(`\nElapsed: ${elapsed}s`);
  if (failures.length > 0) {
    console.log(`\nWARNING: ${failures.length} subject(s) had errors: ${failures.map(f => f.subject).join(', ')}`);
  } else {
    console.log('\nAll subjects processed successfully!');
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

main().catch(e => {
  console.error(`\nFatal error: ${e.message}`);
  if (process.env.DEBUG) console.error(e.stack);
  process.exit(1);
});
