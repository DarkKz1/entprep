// ENTprep Full Question Audit
// Fetches ALL questions + ALL reports from Supabase, cross-references, validates.
//
// Usage:
//   SUPABASE_URL=x SUPABASE_SERVICE_KEY=y node scripts/audit-questions.mjs
//   SUPABASE_URL=x SUPABASE_SERVICE_KEY=y node scripts/audit-questions.mjs --verbose
//   SUPABASE_URL=x SUPABASE_SERVICE_KEY=y node scripts/audit-questions.mjs --subject=physics
//   SUPABASE_URL=x SUPABASE_SERVICE_KEY=y node scripts/audit-questions.mjs --fix-reports
//   SUPABASE_URL=x SUPABASE_SERVICE_KEY=y node scripts/audit-questions.mjs --export=audit-report.json

import { createClient } from '@supabase/supabase-js';

// ── CLI ──────────────────────────────────────────────────────────────────────

const ARGS = process.argv.slice(2);
const VERBOSE = ARGS.includes('--verbose') || ARGS.includes('-v');
const FIX_REPORTS = ARGS.includes('--fix-reports');
const SUBJECT_FILTER = ARGS.find(a => a.startsWith('--subject='))?.split('=')[1] || null;
const EXPORT_FILE = ARGS.find(a => a.startsWith('--export='))?.split('=')[1] || null;

// ── Supabase ─────────────────────────────────────────────────────────────────

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_KEY;
if (!url || !key) {
  console.error('Error: SUPABASE_URL and SUPABASE_SERVICE_KEY required');
  process.exit(1);
}
const sb = createClient(url, key);

// ── Fetch helpers ────────────────────────────────────────────────────────────

async function fetchAll(table, select, filters = {}) {
  const PAGE = 1000;
  const all = [];
  let offset = 0;
  while (true) {
    let q = sb.from(table).select(select);
    for (const [k, v] of Object.entries(filters)) q = q.eq(k, v);
    const { data, error } = await q.range(offset, offset + PAGE - 1);
    if (error) throw new Error(`${table} fetch: ${error.message}`);
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < PAGE) break;
    offset += PAGE;
  }
  return all;
}

// ── Validation rules ─────────────────────────────────────────────────────────

const OPTION_PREFIX_RE = /^[АБВГабвгABCDabcd]\)\s*/;

function validateSingle(row) {
  const issues = [];
  const { q, o, c, e, idx, subject } = row;
  const label = `${subject}[${idx}]`;

  // Critical
  if (!q || q.trim().length <= 5) issues.push({ sev: 'CRIT', rule: 'C1', msg: `${label}: вопрос пустой или <= 5 символов` });
  if (!Array.isArray(o) || o.length !== 4) {
    issues.push({ sev: 'CRIT', rule: 'C2', msg: `${label}: вариантов != 4 (${o?.length})` });
  } else {
    for (let i = 0; i < 4; i++) {
      if (!o[i] || o[i].trim().length === 0) issues.push({ sev: 'CRIT', rule: 'C3', msg: `${label}: вариант[${i}] пустой` });
    }
    const trimmed = o.map(x => (x || '').trim().toLowerCase());
    if (new Set(trimmed).size < 4) issues.push({ sev: 'CRIT', rule: 'C6', msg: `${label}: дублирующиеся варианты` });
  }
  if (!Number.isInteger(c) || c < 0 || c > 3) issues.push({ sev: 'CRIT', rule: 'C4', msg: `${label}: c=${c} вне диапазона 0-3` });
  if (!e || e.trim().length <= 10) issues.push({ sev: 'CRIT', rule: 'C5', msg: `${label}: объяснение <= 10 символов` });

  // Warnings
  if (q && q.length < 15) issues.push({ sev: 'WARN', rule: 'W1', msg: `${label}: короткий вопрос (${q.length} сим.)` });
  if (e && e.trim().length > 10 && e.trim().length < 20) issues.push({ sev: 'WARN', rule: 'W2', msg: `${label}: короткое объяснение (${e.trim().length} сим.)` });

  // Option prefixes
  if (Array.isArray(o)) {
    for (let i = 0; i < o.length; i++) {
      if (o[i] && OPTION_PREFIX_RE.test(o[i])) {
        issues.push({ sev: 'WARN', rule: 'W3', msg: `${label}: вариант[${i}] с буквенным префиксом` });
      }
    }
  }

  // Correct answer length outlier (correct answer suspiciously longer/shorter)
  if (Array.isArray(o) && o.length === 4 && Number.isInteger(c) && c >= 0 && c <= 3) {
    const correctLen = (o[c] || '').length;
    const otherLens = o.filter((_, i) => i !== c).map(x => (x || '').length);
    const avgOtherLen = otherLens.reduce((a, b) => a + b, 0) / otherLens.length;
    if (avgOtherLen > 0) {
      const ratio = correctLen / avgOtherLen;
      if ((ratio > 2.5 || ratio < 0.3) && Math.abs(correctLen - avgOtherLen) > 20) {
        issues.push({ sev: 'WARN', rule: 'W4', msg: `${label}: длина правильного ответа аномальна (${correctLen} vs avg ${avgOtherLen.toFixed(0)})` });
      }
    }
  }

  // Answer text appears in question (giveaway)
  if (q && Array.isArray(o) && Number.isInteger(c) && c >= 0 && c <= 3 && o[c]) {
    const correctLower = (o[c] || '').toLowerCase().trim();
    const questionLower = q.toLowerCase();
    // Only flag if the correct answer is a substantial word/phrase (> 8 chars) and appears verbatim in the question
    if (correctLower.length > 8 && questionLower.includes(correctLower)) {
      issues.push({ sev: 'WARN', rule: 'W5', msg: `${label}: правильный ответ содержится в тексте вопроса` });
    }
  }

  return issues;
}

function validateMultiple(row) {
  const issues = [];
  const { q, o, c, correct_indices, e, idx, subject } = row;
  const label = `${subject}[${idx}]`;

  if (!q || q.trim().length <= 5) issues.push({ sev: 'CRIT', rule: 'MC1', msg: `${label}: вопрос пустой` });
  if (!Array.isArray(o) || o.length < 4 || o.length > 6) {
    issues.push({ sev: 'CRIT', rule: 'MC2', msg: `${label}: вариантов ${o?.length} (нужно 4-6)` });
  }
  if (!Array.isArray(correct_indices) || correct_indices.length < 2 || correct_indices.length > 4) {
    issues.push({ sev: 'CRIT', rule: 'MC3', msg: `${label}: correct_indices невалидны (${JSON.stringify(correct_indices)})` });
  } else if (Array.isArray(o)) {
    for (const ci of correct_indices) {
      if (ci < 0 || ci >= o.length) issues.push({ sev: 'CRIT', rule: 'MC4', msg: `${label}: correct_indices[${ci}] вне диапазона` });
    }
  }
  if (!e || e.trim().length <= 10) issues.push({ sev: 'CRIT', rule: 'MC5', msg: `${label}: объяснение <= 10 символов` });
  if (row.block !== 'multiple') issues.push({ sev: 'WARN', rule: 'MW1', msg: `${label}: block != 'multiple' (${row.block})` });

  return issues;
}

function validateMatching(row) {
  const issues = [];
  const { q, pairs, e, idx, subject } = row;
  const label = `${subject}[${idx}]`;

  if (!q || q.trim().length <= 5) issues.push({ sev: 'CRIT', rule: 'MT1', msg: `${label}: вопрос пустой` });
  if (!Array.isArray(pairs) || pairs.length !== 5) {
    issues.push({ sev: 'CRIT', rule: 'MT2', msg: `${label}: pairs должно быть 5 (${pairs?.length})` });
  } else {
    for (let i = 0; i < pairs.length; i++) {
      if (!Array.isArray(pairs[i]) || pairs[i].length !== 2) {
        issues.push({ sev: 'CRIT', rule: 'MT3', msg: `${label}: pair[${i}] невалидна` });
      } else {
        if (!pairs[i][0] || !pairs[i][1]) issues.push({ sev: 'CRIT', rule: 'MT4', msg: `${label}: pair[${i}] содержит пустую сторону` });
      }
    }
    // Check for duplicate left or right sides
    const lefts = pairs.filter(p => Array.isArray(p) && p.length === 2).map(p => (p[0] || '').trim().toLowerCase());
    const rights = pairs.filter(p => Array.isArray(p) && p.length === 2).map(p => (p[1] || '').trim().toLowerCase());
    if (new Set(lefts).size < lefts.length) issues.push({ sev: 'CRIT', rule: 'MT5', msg: `${label}: дублирующиеся левые стороны` });
    if (new Set(rights).size < rights.length) issues.push({ sev: 'CRIT', rule: 'MT6', msg: `${label}: дублирующиеся правые стороны` });
  }
  if (!e || e.trim().length <= 10) issues.push({ sev: 'CRIT', rule: 'MT7', msg: `${label}: объяснение <= 10 символов` });
  if (row.block !== 'matching') issues.push({ sev: 'WARN', rule: 'MTW1', msg: `${label}: block != 'matching' (${row.block})` });

  return issues;
}

function validateRow(row) {
  const type = row.type || 'single';
  if (type === 'multiple') return validateMultiple(row);
  if (type === 'matching') return validateMatching(row);
  return validateSingle(row);
}

// ── Deduplication ────────────────────────────────────────────────────────────

function tokenize(text) {
  return (text || '').toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, '').split(/\s+/).filter(w => w.length > 2);
}

function jaccard(setA, setB) {
  if (setA.size === 0 && setB.size === 0) return 1;
  let inter = 0;
  for (const item of setA) if (setB.has(item)) inter++;
  const union = setA.size + setB.size - inter;
  return union === 0 ? 0 : inter / union;
}

function findDuplicates(questions) {
  const THRESHOLD = 0.75;
  const tokenSets = questions.map(q => ({ id: q.id, idx: q.idx, subject: q.subject, tokens: new Set(tokenize(q.q)) }));
  const dupes = [];

  for (let i = 0; i < tokenSets.length; i++) {
    for (let j = i + 1; j < tokenSets.length; j++) {
      if (tokenSets[i].subject !== tokenSets[j].subject) continue; // only intra-subject
      const sim = jaccard(tokenSets[i].tokens, tokenSets[j].tokens);
      if (sim >= THRESHOLD) {
        dupes.push({
          a: { id: tokenSets[i].id, idx: tokenSets[i].idx, subject: tokenSets[i].subject },
          b: { id: tokenSets[j].id, idx: tokenSets[j].idx, subject: tokenSets[j].subject },
          similarity: sim,
          qA: questions[i].q.slice(0, 80),
          qB: questions[j].q.slice(0, 80),
        });
      }
    }
  }
  return dupes;
}

// ── C-distribution ───────────────────────────────────────────────────────────

function cDistribution(questions) {
  const dist = [0, 0, 0, 0];
  for (const q of questions) {
    if (Number.isInteger(q.c) && q.c >= 0 && q.c <= 3) dist[q.c]++;
  }
  return dist;
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n╔══════════════════════════════════════════════════════╗');
  console.log('║            ENTprep Full Question Audit               ║');
  console.log('╚══════════════════════════════════════════════════════╝\n');

  // 1. Fetch questions
  console.log('1) Fetching questions...');
  const selectCols = 'id,subject,idx,topic,q,o,c,e,type,correct_indices,pairs,difficulty,block,source';
  let allQuestions;
  if (SUBJECT_FILTER) {
    allQuestions = await fetchAll('questions', selectCols, { subject: SUBJECT_FILTER });
  } else {
    allQuestions = await fetchAll('questions', selectCols);
  }
  console.log(`   ${allQuestions.length} questions loaded\n`);

  // 2. Fetch reports
  console.log('2) Fetching question reports...');
  const allReports = await fetchAll('question_reports', 'id,question_id,subject,idx,reason,user_id,comment,created_at');
  console.log(`   ${allReports.length} reports found\n`);

  // 3. Cross-reference reports with questions
  console.log('3) Analyzing reports...\n');
  const reportsByQId = {};
  for (const r of allReports) {
    if (!reportsByQId[r.question_id]) reportsByQId[r.question_id] = [];
    reportsByQId[r.question_id].push(r);
  }

  const reportedQuestions = [];
  for (const q of allQuestions) {
    if (reportsByQId[q.id]) {
      reportedQuestions.push({ ...q, reports: reportsByQId[q.id] });
    }
  }

  if (reportedQuestions.length > 0) {
    console.log('   ═══ REPORTED QUESTIONS ═══\n');

    // Sort by report count descending
    reportedQuestions.sort((a, b) => b.reports.length - a.reports.length);

    const reasonCounts = {};
    for (const rq of reportedQuestions) {
      for (const r of rq.reports) {
        reasonCounts[r.reason] = (reasonCounts[r.reason] || 0) + 1;
      }
    }

    console.log('   Report reasons summary:');
    for (const [reason, count] of Object.entries(reasonCounts).sort((a, b) => b[1] - a[1])) {
      console.log(`     ${reason}: ${count}`);
    }
    console.log('');

    for (const rq of reportedQuestions) {
      const reasons = rq.reports.map(r => r.reason).join(', ');
      const comments = rq.reports.filter(r => r.comment).map(r => r.comment);
      console.log(`   🔴 ${rq.subject}[${rq.idx}] — ${rq.reports.length} report(s): ${reasons}`);
      console.log(`      Q: ${rq.q.slice(0, 100)}${rq.q.length > 100 ? '...' : ''}`);
      if (Array.isArray(rq.o)) {
        rq.o.forEach((opt, i) => {
          const marker = i === rq.c ? ' ✓' : '';
          console.log(`      ${String.fromCharCode(65 + i)}) ${opt}${marker}`);
        });
      }
      if (rq.e) console.log(`      E: ${rq.e.slice(0, 80)}${rq.e.length > 80 ? '...' : ''}`);
      if (comments.length > 0) {
        for (const cm of comments) console.log(`      💬 "${cm}"`);
      }
      console.log('');
    }
  } else {
    console.log('   No reported questions found.\n');
  }

  // 4. Validate all questions
  console.log('4) Validating all questions...\n');

  const bySubject = {};
  for (const q of allQuestions) {
    if (!bySubject[q.subject]) bySubject[q.subject] = [];
    bySubject[q.subject].push(q);
  }

  const summaryRows = [];
  let grandCritical = 0;
  let grandWarnings = 0;
  let grandDupes = 0;
  const allIssues = []; // for export

  for (const [subject, questions] of Object.entries(bySubject).sort()) {
    let criticals = 0;
    let warnings = 0;
    const subjectIssues = [];

    // Type distribution
    const typeDist = { single: 0, multiple: 0, matching: 0 };
    for (const q of questions) typeDist[q.type || 'single']++;

    // Validate each question
    for (const q of questions) {
      const issues = validateRow(q);
      for (const issue of issues) {
        if (issue.sev === 'CRIT') criticals++;
        else warnings++;
        subjectIssues.push({ ...issue, id: q.id, idx: q.idx });
        if (VERBOSE) {
          const icon = issue.sev === 'CRIT' ? '  🔴' : '  ⚠️ ';
          console.log(`${icon} ${issue.msg}`);
        }
      }
    }

    // Intra-subject duplicates (only for single-type, skip matching/multiple)
    const singleQs = questions.filter(q => (q.type || 'single') === 'single');
    const dupes = findDuplicates(singleQs);
    if (VERBOSE && dupes.length > 0) {
      for (const d of dupes) {
        console.log(`  🔁 DUPE (${(d.similarity * 100).toFixed(0)}%): [${d.a.idx}] "${d.qA}" ↔ [${d.b.idx}] "${d.qB}"`);
      }
    }

    // C-distribution (only for single-type)
    const dist = cDistribution(singleQs);
    const total = singleQs.length;
    const pcts = dist.map(d => total > 0 ? (d / total * 100).toFixed(1) : '0');
    const maxPct = total > 0 ? Math.max(...dist) / total * 100 : 0;
    const cOk = maxPct <= 35;

    // Reported count for this subject
    const reportedCount = reportedQuestions.filter(q => q.subject === subject).length;

    const icon = criticals > 0 ? '❌' : warnings > 0 || !cOk || reportedCount > 0 ? '⚠️ ' : '✅';
    const typeStr = typeDist.multiple > 0 || typeDist.matching > 0
      ? ` [S:${typeDist.single} M:${typeDist.multiple} MT:${typeDist.matching}]`
      : '';
    console.log(`${icon} ${subject.padEnd(15)} ${String(questions.length).padStart(4)}q${typeStr}  c:[${pcts.join(',')}]  ${criticals} crit  ${warnings} warn  ${dupes.length} dup  ${reportedCount} rpt  ${cOk ? 'c:OK' : 'c:BAD'}`);

    grandCritical += criticals;
    grandWarnings += warnings;
    grandDupes += dupes.length;

    summaryRows.push({
      subject,
      total: questions.length,
      types: typeDist,
      criticals,
      warnings,
      dupes: dupes.length,
      reported: reportedCount,
      cDist: dist,
      cOk,
    });

    allIssues.push(...subjectIssues.map(i => ({ ...i, subject })));
  }

  // 5. Summary
  const totalReported = reportedQuestions.length;
  console.log('\n' + '═'.repeat(70));
  console.log(`TOTAL: ${allQuestions.length} questions | ${grandCritical} critical | ${grandWarnings} warnings | ${grandDupes} duplicates | ${totalReported} reported`);
  console.log('═'.repeat(70));

  // Action items
  console.log('\n📋 ACTION ITEMS:\n');
  if (totalReported > 0) console.log(`  1. Review and fix ${totalReported} reported question(s) — see list above`);
  if (grandCritical > 0) console.log(`  2. Fix ${grandCritical} critical validation error(s)`);
  if (grandDupes > 0) console.log(`  3. Review ${grandDupes} potential duplicate(s)`);
  const imbalanced = summaryRows.filter(s => !s.cOk);
  if (imbalanced.length > 0) console.log(`  4. Rebalance c-distribution for: ${imbalanced.map(s => s.subject).join(', ')}`);

  // Type coverage summary
  console.log('\n📊 TYPE COVERAGE:\n');
  console.log('  Subject          | Single | Multiple | Matching | Total');
  console.log('  ' + '-'.repeat(58));
  for (const s of summaryRows) {
    console.log(`  ${s.subject.padEnd(17)}| ${String(s.types.single).padStart(6)} | ${String(s.types.multiple).padStart(8)} | ${String(s.types.matching).padStart(8)} | ${String(s.total).padStart(5)}`);
  }

  // Export
  if (EXPORT_FILE) {
    const { writeFileSync } = await import('fs');
    const report = {
      timestamp: new Date().toISOString(),
      totalQuestions: allQuestions.length,
      totalReports: allReports.length,
      reportedQuestions: reportedQuestions.map(rq => ({
        id: rq.id,
        subject: rq.subject,
        idx: rq.idx,
        q: rq.q,
        o: rq.o,
        c: rq.c,
        e: rq.e,
        type: rq.type || 'single',
        reports: rq.reports.map(r => ({ reason: r.reason, comment: r.comment, date: r.created_at })),
      })),
      validationIssues: allIssues,
      subjectSummary: summaryRows,
    };
    writeFileSync(EXPORT_FILE, JSON.stringify(report, null, 2));
    console.log(`\n📁 Report exported to ${EXPORT_FILE}`);
  }

  // Fix reported: delete reports after review (optional)
  if (FIX_REPORTS && reportedQuestions.length > 0) {
    console.log('\n⚠️  --fix-reports: This would delete reported questions from Supabase.');
    console.log('   Not implemented yet — review the report above and fix manually.');
  }

  console.log('');
}

main().catch(err => {
  console.error(`Fatal: ${err.message}`);
  process.exit(1);
});
