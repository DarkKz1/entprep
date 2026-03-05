#!/usr/bin/env node
/**
 * Question Quality Audit Script (v2)
 *
 * Checks:
 * 1. Self-answering (correct answer text in question) — critical
 * 2. Trivial patterns ("Что такое...", etc.) — subject-aware
 * 3. Short questions (reading passages exempt) — warning
 * 4. Weak/empty explanations — warning
 *
 * Uses shared quality module: scripts/utils/quality.mjs
 *
 * Usage:
 *   node scripts/audit-quality.mjs                     # summary only
 *   node scripts/audit-quality.mjs --all               # show all issues
 *   node scripts/audit-quality.mjs --subject=physics   # one subject
 *   node scripts/audit-quality.mjs --export=report.json
 */

import { createClient } from '@supabase/supabase-js';
import { checkQuestion, SUBJECT_NAMES } from './utils/quality.mjs';

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const args = process.argv.slice(2);
const subjectArg = args.find(a => a.startsWith('--subject='))?.split('=')[1];
const showAll = args.includes('--all');
const exportArg = args.find(a => a.startsWith('--export='))?.split('=')[1];

async function fetchAll(subject) {
  const PAGE = 1000;
  let rows = [], offset = 0;
  while (true) {
    const { data, error } = await supabase
      .from('questions')
      .select('id, idx, q, o, c, e, type, topic, passage_group')
      .eq('subject', subject)
      .order('idx')
      .range(offset, offset + PAGE - 1);
    if (error) throw error;
    rows = rows.concat(data);
    if (data.length < PAGE) break;
    offset += PAGE;
  }
  return rows;
}

async function auditSubject(subject) {
  let rows;
  try {
    rows = await fetchAll(subject);
  } catch (err) {
    console.error(`Error fetching ${subject}:`, err.message);
    return { subject, total: 0, issues: [] };
  }

  const isReading = subject === 'reading';
  const issues = [];

  for (const row of rows) {
    const rowIssues = checkQuestion(row, {
      subject,
      isPassage: isReading || row.passage_group != null,
    });

    if (rowIssues.length > 0) {
      issues.push({
        id: row.id,
        idx: row.idx,
        q: row.q,
        type: row.type || 'single',
        issues: rowIssues,
      });
    }
  }

  return { subject, total: rows.length, issues };
}

function printSubjectReport(result) {
  const { subject, total, issues } = result;
  const criticals = issues.filter(i => i.issues.some(ii => ii.severity === 'critical'));
  const warnings = issues.filter(i => i.issues.every(ii => ii.severity === 'warning'));

  const counts = {};
  for (const issue of issues) {
    for (const ii of issue.issues) {
      counts[ii.type] = (counts[ii.type] || 0) + 1;
    }
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`${SUBJECT_NAMES[subject] || subject} (${subject})`);
  console.log('='.repeat(60));
  console.log(`  Total: ${total} | Issues: ${issues.length} (${criticals.length} critical, ${warnings.length} warnings)`);

  for (const [type, count] of Object.entries(counts)) {
    console.log(`  ${type}: ${count}`);
  }

  const toShow = showAll ? issues : issues.filter(i => i.issues.some(ii => ii.severity === 'critical'));
  if (toShow.length > 0) {
    const label = showAll ? 'All issues' : 'Critical issues';
    console.log(`\n  ${label}:`);
    for (const issue of toShow.slice(0, showAll ? 999 : 30)) {
      console.log(`  [#${issue.idx}] "${issue.q.slice(0, 75)}${issue.q.length > 75 ? '...' : ''}"`);
      for (const ii of issue.issues) {
        const icon = ii.severity === 'critical' ? '🔴' : '🟡';
        console.log(`    ${icon} ${ii.type}: ${ii.detail}`);
      }
    }
  }

  return result;
}

async function main() {
  const PROFILE_SUBJECTS = [
    'physics', 'biology', 'math_profile', 'english', 'chemistry',
    'geography', 'world_history', 'informatics', 'law', 'literature',
  ];
  const MANDATORY_SUBJECTS = ['history', 'math', 'reading'];

  const subjects = subjectArg
    ? [subjectArg]
    : [...MANDATORY_SUBJECTS, ...PROFILE_SUBJECTS];

  console.log('ENTprep Question Quality Audit v2');
  console.log(`Subjects: ${subjects.join(', ')}\n`);

  const results = [];
  for (const subject of subjects) {
    const result = await auditSubject(subject);
    printSubjectReport(result);
    results.push(result);
  }

  // Summary table
  console.log(`\n${'='.repeat(70)}`);
  console.log('SUMMARY');
  console.log('='.repeat(70));
  console.log(`${'Subject'.padEnd(16)} ${'Total'.padStart(6)} ${'Issues'.padStart(7)} ${'Crit'.padStart(6)} ${'Self-ans'.padStart(9)} ${'Trivial'.padStart(8)} ${'Short'.padStart(6)} ${'Weak-exp'.padStart(9)}`);
  console.log('-'.repeat(70));

  let grandTotal = 0, grandIssues = 0, grandCritical = 0;
  for (const r of results) {
    const counts = { 'self-answer': 0, trivial: 0, short: 0, 'weak-explanation': 0 };
    let crits = 0;
    for (const i of r.issues) {
      for (const ii of i.issues) {
        counts[ii.type] = (counts[ii.type] || 0) + 1;
        if (ii.severity === 'critical') crits++;
      }
    }
    console.log(
      `${r.subject.padEnd(16)} ${String(r.total).padStart(6)} ${String(r.issues.length).padStart(7)} ${String(crits).padStart(6)} ` +
      `${String(counts['self-answer']).padStart(9)} ${String(counts.trivial).padStart(8)} ${String(counts.short).padStart(6)} ${String(counts['weak-explanation']).padStart(9)}`
    );
    grandTotal += r.total;
    grandIssues += r.issues.length;
    grandCritical += crits;
  }
  console.log('-'.repeat(70));
  console.log(`${'TOTAL'.padEnd(16)} ${String(grandTotal).padStart(6)} ${String(grandIssues).padStart(7)} ${String(grandCritical).padStart(6)}`);

  // Export if requested
  if (exportArg) {
    const { writeFileSync } = await import('fs');
    const report = results.map(r => ({
      subject: r.subject,
      total: r.total,
      issues: r.issues.map(i => ({
        id: i.id, idx: i.idx, q: i.q, type: i.type,
        issues: i.issues.map(ii => ({ type: ii.type, detail: ii.detail, severity: ii.severity })),
      })),
    }));
    writeFileSync(exportArg, JSON.stringify(report, null, 2));
    console.log(`\nReport exported to ${exportArg}`);
  }
}

main().catch(console.error);
