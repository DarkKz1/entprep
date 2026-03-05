// ENTprep Supabase Question Validator
// Usage:
//   SUPABASE_URL=x SUPABASE_SERVICE_KEY=y node scripts/validate-supabase.mjs
//   SUPABASE_URL=x SUPABASE_SERVICE_KEY=y node scripts/validate-supabase.mjs --subject=physics --verbose
//   SUPABASE_URL=x SUPABASE_SERVICE_KEY=y node scripts/validate-supabase.mjs --fix

// ── Imports ──────────────────────────────────────────────────────────────────

import { createClient } from '@supabase/supabase-js';
import { tokenize, jaccard as jaccardArrays, JACCARD_THRESHOLD } from './utils/quality.mjs';

// ── CLI ──────────────────────────────────────────────────────────────────────

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = { subject: null, verbose: false, fix: false };
  for (const a of args) {
    if (a === '--verbose' || a === '-v') opts.verbose = true;
    else if (a === '--fix') opts.fix = true;
    else if (a.startsWith('--subject=')) opts.subject = a.split('=')[1];
    else if (a === '--help' || a === '-h') {
      console.log(`
ENTprep Supabase Question Validator

Usage:
  node scripts/validate-supabase.mjs [options]

Options:
  --subject=<id>   Validate only one subject (e.g. physics, math, history)
  --verbose, -v    Show every individual issue
  --fix            Auto-fix: strip option prefixes, rebalance c-distribution
  --help           Show this help

Environment:
  SUPABASE_URL          Required
  SUPABASE_SERVICE_KEY  Required
`);
      process.exit(0);
    }
  }
  return opts;
}

// ── Supabase client ──────────────────────────────────────────────────────────

function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    console.error('Error: SUPABASE_URL and SUPABASE_SERVICE_KEY env vars required');
    process.exit(1);
  }
  return createClient(url, key);
}

// ── Fetch all questions ──────────────────────────────────────────────────────

async function fetchQuestions(sb, subject) {
  let query = sb.from('questions').select('id,subject,idx,topic,q,o,c,e,report_count,source');
  if (subject) query = query.eq('subject', subject);
  query = query.order('subject').order('idx', { ascending: true });

  // Supabase paginates at 1000 rows — fetch all
  const allRows = [];
  let offset = 0;
  const PAGE = 1000;
  while (true) {
    const { data, error } = await query.range(offset, offset + PAGE - 1);
    if (error) throw new Error(`Supabase fetch error: ${error.message}`);
    if (!data || data.length === 0) break;
    allRows.push(...data);
    if (data.length < PAGE) break;
    offset += PAGE;
  }
  return allRows;
}

// ── Validation rules (adapted from ingest-questions.mjs) ─────────────────────

const OPTION_PREFIX_RE = /^[АБВГабвгABCDabcd]\)\s*/;

function validateQuestion(row) {
  const errors = [];
  const warnings = [];
  const { id, subject, idx, q, o, c, e } = row;
  const label = `${subject}[${idx}]`;

  // C1: q non-empty > 5 chars
  if (!q || q.trim().length <= 5) errors.push({ rule: 'C1', msg: `${label}: question empty or <= 5 chars` });

  // C2: exactly 4 options
  if (!Array.isArray(o) || o.length !== 4) {
    errors.push({ rule: 'C2', msg: `${label}: options count != 4 (got ${o?.length})` });
  } else {
    // C3: options non-empty
    for (let i = 0; i < 4; i++) {
      if (!o[i] || o[i].trim().length === 0) {
        errors.push({ rule: 'C3', msg: `${label}: option[${i}] empty` });
      }
    }
    // C6: no duplicate options
    const trimmed = o.map(x => (x || '').trim().toLowerCase());
    if (new Set(trimmed).size < 4) errors.push({ rule: 'C6', msg: `${label}: duplicate options` });

    // W: option has letter prefix (fixable)
    for (let i = 0; i < 4; i++) {
      if (o[i] && OPTION_PREFIX_RE.test(o[i])) {
        warnings.push({ rule: 'W-prefix', msg: `${label}: option[${i}] has letter prefix`, fixable: true });
      }
    }
  }

  // C4: c in range [0,3]
  if (!Number.isInteger(c) || c < 0 || c > 3) {
    errors.push({ rule: 'C4', msg: `${label}: c=${c} out of range` });
  }

  // C5: explanation > 10 chars
  if (!e || e.trim().length <= 10) errors.push({ rule: 'C5', msg: `${label}: explanation <= 10 chars` });

  // W: short question
  if (q && q.length < 15) warnings.push({ rule: 'W-short-q', msg: `${label}: short question (${q.length} chars)` });

  // W: short explanation (< 20 chars but > 10)
  if (e && e.trim().length > 10 && e.trim().length < 20) {
    warnings.push({ rule: 'W-short-e', msg: `${label}: short explanation (${e.trim().length} chars)` });
  }

  return { errors, warnings };
}

// ── Deduplication — tokenize/jaccard imported from utils/quality.mjs ─────────

function findDuplicates(questions) {
  const tokenArrays = questions.map(q => tokenize(q.q));
  const dupes = [];

  for (let i = 0; i < questions.length; i++) {
    for (let j = i + 1; j < questions.length; j++) {
      const sim = jaccardArrays(tokenArrays[i], tokenArrays[j]);
      if (sim >= JACCARD_THRESHOLD) {
        dupes.push({ a: questions[i], b: questions[j], similarity: sim });
      }
    }
  }
  return dupes;
}

// ── Option similarity check ──────────────────────────────────────────────────

function findSimilarOptions(questions) {
  const THRESHOLD = 0.80;
  const issues = [];

  for (const row of questions) {
    if (!Array.isArray(row.o) || row.o.length !== 4) continue;
    const optSets = row.o.map(o => new Set(tokenize(o)));
    for (let i = 0; i < 4; i++) {
      for (let j = i + 1; j < 4; j++) {
        const sim = jaccard(optSets[i], optSets[j]);
        if (sim >= THRESHOLD && optSets[i].size > 0) {
          issues.push({
            row,
            msg: `${row.subject}[${row.idx}]: options ${i} & ${j} too similar (${(sim * 100).toFixed(0)}%)`,
          });
        }
      }
    }
  }
  return issues;
}

// ── C-distribution analysis ──────────────────────────────────────────────────

function cDistribution(questions) {
  const dist = [0, 0, 0, 0];
  for (const q of questions) {
    if (Number.isInteger(q.c) && q.c >= 0 && q.c <= 3) dist[q.c]++;
  }
  return dist;
}

// ── Fix: strip prefixes ──────────────────────────────────────────────────────

function stripPrefixes(row) {
  if (!Array.isArray(row.o)) return null;
  const fixed = row.o.map(o => (o || '').trim().replace(OPTION_PREFIX_RE, ''));
  const changed = row.o.some((o, i) => o !== fixed[i]);
  return changed ? fixed : null;
}

// ── Fix: rebalance c-distribution ────────────────────────────────────────────

function shuffleOptions(q) {
  const correctText = q.o[q.c];
  const shuffled = [...q.o];
  // Fisher-Yates
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  const newC = shuffled.indexOf(correctText);
  return { o: shuffled, c: newC };
}

function rebalanceSubject(questions) {
  // Only rebalance if max c% > 35%
  const dist = cDistribution(questions);
  const total = questions.length;
  if (total === 0) return [];
  const maxPct = Math.max(...dist) / total * 100;
  if (maxPct <= 35) return [];

  const MAX_ATTEMPTS = 50;
  // Try to find a balanced shuffle
  const updates = [];
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const candidate = questions.map(q => ({ ...q, ...shuffleOptions(q) }));
    const newDist = cDistribution(candidate);
    const newMax = Math.max(...newDist) / total * 100;
    if (newMax <= 35) {
      // Collect only actually changed rows
      for (let i = 0; i < questions.length; i++) {
        if (candidate[i].c !== questions[i].c) {
          updates.push({ id: questions[i].id, o: candidate[i].o, c: candidate[i].c });
        }
      }
      return updates;
    }
  }
  return []; // Could not balance
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const opts = parseArgs();
  const sb = getSupabase();

  console.log('\n=== ENTprep Supabase Question Validator ===\n');

  // Fetch
  console.log('Fetching questions...');
  const rows = await fetchQuestions(sb, opts.subject);
  console.log(`Fetched ${rows.length} questions\n`);

  if (rows.length === 0) {
    console.log('No questions found.');
    return;
  }

  // Group by subject
  const bySubject = {};
  for (const r of rows) {
    if (!bySubject[r.subject]) bySubject[r.subject] = [];
    bySubject[r.subject].push(r);
  }

  const summaryRows = [];
  let totalFixes = 0;

  for (const [subject, questions] of Object.entries(bySubject).sort()) {
    console.log(`--- ${subject} (${questions.length} questions) ---`);

    // 1. Validate each question
    let criticals = 0;
    let warns = 0;
    const prefixFixes = [];

    for (const row of questions) {
      const result = validateQuestion(row);
      criticals += result.errors.length;
      warns += result.warnings.length;

      if (opts.verbose) {
        for (const e of result.errors) console.log(`  ERROR ${e.rule}: ${e.msg}`);
        for (const w of result.warnings) console.log(`  WARN  ${w.rule}: ${w.msg}`);
      }

      // Collect prefix fixes
      if (opts.fix) {
        const fixed = stripPrefixes(row);
        if (fixed) prefixFixes.push({ id: row.id, o: fixed });
      }
    }

    // 2. Find intra-subject duplicates
    const dupes = findDuplicates(questions);
    if (opts.verbose && dupes.length > 0) {
      for (const d of dupes) {
        console.log(`  DUPE (${(d.similarity * 100).toFixed(0)}%): "${d.a.q.slice(0, 50)}..." ↔ "${d.b.q.slice(0, 50)}..."`);
      }
    }

    // 3. Similar options
    const simOpts = findSimilarOptions(questions);
    if (opts.verbose && simOpts.length > 0) {
      for (const s of simOpts) console.log(`  SIM-OPT: ${s.msg}`);
    }

    // 4. C-distribution
    const dist = cDistribution(questions);
    const total = questions.length;
    const pcts = dist.map(d => (d / total * 100).toFixed(1));
    const maxPct = Math.max(...dist) / total * 100;
    const cBalanced = maxPct <= 35;

    if (opts.verbose || !cBalanced) {
      console.log(`  C-dist: [${dist.join(',')}] → [${pcts.join('%,')}%] ${cBalanced ? 'OK' : 'IMBALANCED'}`);
    }

    // 5. Apply fixes
    if (opts.fix) {
      // Strip prefixes
      if (prefixFixes.length > 0) {
        console.log(`  Fixing ${prefixFixes.length} option prefixes...`);
        for (const fix of prefixFixes) {
          const { error } = await sb.from('questions').update({ o: fix.o }).eq('id', fix.id);
          if (error) console.log(`    Error fixing ${fix.id}: ${error.message}`);
        }
        totalFixes += prefixFixes.length;
      }

      // Rebalance c-distribution
      if (!cBalanced) {
        console.log(`  Rebalancing c-distribution...`);
        const updates = rebalanceSubject(questions);
        if (updates.length > 0) {
          for (const u of updates) {
            const { error } = await sb.from('questions').update({ o: u.o, c: u.c }).eq('id', u.id);
            if (error) console.log(`    Error rebalancing ${u.id}: ${error.message}`);
          }
          console.log(`  Rebalanced ${updates.length} questions`);
          totalFixes += updates.length;
        } else {
          console.log(`  Could not achieve balance within attempts`);
        }
      }
    }

    summaryRows.push({
      subject,
      total: questions.length,
      criticals,
      warnings: warns,
      dupes: dupes.length,
      simOpts: simOpts.length,
      cDist: `[${pcts.join(',')}]`,
      cOk: cBalanced ? 'OK' : 'BAD',
    });

    console.log('');
  }

  // Summary table
  console.log('=== SUMMARY ===\n');
  console.log(
    'Subject'.padEnd(16) +
    'Total'.padStart(6) +
    'Crit'.padStart(6) +
    'Warn'.padStart(6) +
    'Dupes'.padStart(7) +
    'SimOpt'.padStart(8) +
    'C-bal'.padStart(6)
  );
  console.log('-'.repeat(55));

  let grandTotal = 0, grandCrit = 0, grandWarn = 0, grandDupes = 0, grandSim = 0;
  for (const r of summaryRows) {
    console.log(
      r.subject.padEnd(16) +
      String(r.total).padStart(6) +
      String(r.criticals).padStart(6) +
      String(r.warnings).padStart(6) +
      String(r.dupes).padStart(7) +
      String(r.simOpts).padStart(8) +
      r.cOk.padStart(6)
    );
    grandTotal += r.total;
    grandCrit += r.criticals;
    grandWarn += r.warnings;
    grandDupes += r.dupes;
    grandSim += r.simOpts;
  }

  console.log('-'.repeat(55));
  console.log(
    'TOTAL'.padEnd(16) +
    String(grandTotal).padStart(6) +
    String(grandCrit).padStart(6) +
    String(grandWarn).padStart(6) +
    String(grandDupes).padStart(7) +
    String(grandSim).padStart(8)
  );

  if (opts.fix && totalFixes > 0) {
    console.log(`\nApplied ${totalFixes} fixes total.`);
  }

  console.log('');
}

main().catch(err => {
  console.error(`Fatal: ${err.message}`);
  process.exit(1);
});
