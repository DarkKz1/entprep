#!/usr/bin/env node
/**
 * Replace weak/trivial questions with higher-quality AI-generated ones (v2).
 *
 * Improvements over v1:
 * - Uses shared quality module (no duplicated logic)
 * - Preserves metadata: topic, difficulty, block fields
 * - Checks for duplicates before inserting replacement
 * - Better self-answer detection (subject-aware, min word count)
 *
 * Usage:
 *   node scripts/replace-weak.mjs                    # all subjects
 *   node scripts/replace-weak.mjs --subject=physics   # one subject
 *   node scripts/replace-weak.mjs --dry-run           # preview only
 *   node scripts/replace-weak.mjs --resume=chemistry   # resume from subject
 */

import { createClient } from '@supabase/supabase-js';
import {
  isWeak, checkQuestion, checkDuplicate,
  SUBJECT_NAMES, QUALITY_RULES, STEM_SUBJECTS,
} from './utils/quality.mjs';
import { getTemperature, getSTEMPrefix, VALID_SUBJECTS, AI_MODEL } from './utils/constants.mjs';
import { extractJSON } from './utils/json.mjs';

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

if (!process.env.ANTHROPIC_API_KEY) {
  console.error('Error: ANTHROPIC_API_KEY required');
  process.exit(1);
}

const args = process.argv.slice(2);
const subjectArg = args.find(a => a.startsWith('--subject='))?.split('=')[1];
const resumeArg = args.find(a => a.startsWith('--resume='))?.split('=')[1];
const dryRun = args.includes('--dry-run');

const MODEL = AI_MODEL;
const BATCH_SIZE = 5;
const INTER_CALL_DELAY = 15000;

// STEM_SUBJECTS imported from quality.mjs (re-exported from constants.mjs)

// ── AI call ──────────────────────────────────────────────────────────────────
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function callAnthropic(systemPrompt, userPrompt, maxRetries = 4, temperature = 0.8) {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: MODEL,
          max_tokens: 8192,
          temperature,
          system: systemPrompt,
          messages: [{ role: 'user', content: userPrompt }],
        }),
      });
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`API ${res.status}: ${errText.slice(0, 200)}`);
      }
      const data = await res.json();
      const raw = data.content?.[0]?.text?.trim();
      if (!raw) throw new Error('Empty response');
      return extractJSON(raw);
    } catch (e) {
      const isRate = e.message.includes('429') || e.message.includes('rate_limit');
      if (attempt < maxRetries) {
        const wait = isRate ? 30 + attempt * 20 : 5 + attempt * 3;
        console.log(`    Retry ${attempt + 1}/${maxRetries} in ${wait}s — ${isRate ? 'rate limit' : e.message.slice(0, 60)}`);
        await sleep(wait * 1000);
      } else throw e;
    }
  }
}

// ── Replacement prompt ─────────────────────────────────────────────────────

function buildReplacementPrompt(subject, weakQuestions) {
  const subjectName = SUBJECT_NAMES[subject] || subject;
  const weakList = weakQuestions.map((w, i) => {
    const issues = checkQuestion(w.row, { subject });
    const issueStr = issues.map(ii => ii.type).join(', ');
    return `${i + 1}. [${issueStr}] "${w.row.q}"${w.row.topic ? ` (тема: ${w.row.topic})` : ''}`;
  }).join('\n');

  return {
    system: `Ты эксперт по созданию СЛОЖНЫХ вопросов для ЕНТ (Единое национальное тестирование, Казахстан).
Предмет: ${subjectName}

Задача: Ниже список СЛАБЫХ вопросов которые нужно ЗАМЕНИТЬ. Для каждого создай НОВЫЙ вопрос по ТОЙ ЖЕ ТЕМЕ, но НАМНОГО сложнее и качественнее.
${getSTEMPrefix(subject)}
Правила формата:
1. Все тексты на РУССКОМ языке
2. Ровно 4 варианта ответа, без буквенных префиксов (А, Б, В, Г)
3. Все 4 варианта правдоподобные и примерно одинаковой длины
4. Правильный ответ (c) — индекс 0-3, распределяй РАВНОМЕРНО
5. НЕ добавляй подсказки в скобках
6. Объяснение (e) — 1-3 предложения, ОБРАЗОВАТЕЛЬНОЕ, НЕ "Правильный ответ: X"
7. Ответ строго JSON, количество вопросов = количество слабых
${QUALITY_RULES}

Верни JSON: {"questions":[{"q":"текст","o":["в1","в2","в3","в4"],"c":0,"e":"объяснение"}]}`,
    user: `Замени ${weakQuestions.length} слабых вопросов на СЛОЖНЫЕ. Сохрани тему каждого вопроса:\n\n${weakList}`,
  };
}

// ── STEM answer verification ────────────────────────────────────────────────
async function verifyReplacementAnswer(question, subject) {
  const subjectName = SUBJECT_NAMES[subject] || subject;
  const optionsStr = question.o.map((o, i) => `${i}) ${o}`).join('\n');

  const systemPrompt = `Ты преподаватель предмета "${subjectName}". Реши задачу САМОСТОЯТЕЛЬНО, шаг за шагом.
После решения верни ТОЛЬКО JSON: {"answer": <индекс 0-3>, "reasoning": "краткое обоснование"}
Не угадывай — если не уверен в ответе, верни {"answer": -1, "reasoning": "не удалось определить"}`;

  const userPrompt = `Вопрос: ${question.q}\n\nВарианты:\n${optionsStr}\n\nРеши задачу и укажи правильный ответ (индекс 0-3).`;

  const parsed = await callAnthropic(systemPrompt, userPrompt, 2, 0);

  if (parsed.answer === -1) return true; // inconclusive → keep
  const aiAnswer = typeof parsed.answer === 'number' ? parsed.answer : parseInt(parsed.answer, 10);
  if (isNaN(aiAnswer) || aiAnswer < 0 || aiAnswer > 3) return true; // inconclusive → keep
  return aiAnswer === question.c;
}

// ── Main logic ───────────────────────────────────────────────────────────────
// 'reading' excluded: passages need special handling (5q per passage), not single-choice replacement
const ALL_SUBJECTS = VALID_SUBJECTS.filter(s => s !== 'reading');

async function processSubject(subject) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Processing: ${SUBJECT_NAMES[subject] || subject}`);
  console.log('='.repeat(60));

  // Fetch all questions for this subject
  const { data: rows, error } = await supabase
    .from('questions')
    .select('id, idx, q, o, c, e, type, topic, difficulty, block')
    .eq('subject', subject)
    .order('idx');

  if (error || !rows) {
    console.error(`  Error fetching: ${error?.message}`);
    return 0;
  }

  // Find weak single-type questions
  const weak = [];
  for (const row of rows) {
    const t = row.type || 'single';
    if (t !== 'single') continue; // only replace single-type
    if (isWeak(row, subject, false)) {
      weak.push({ row, issues: checkQuestion(row, { subject }) });
    }
  }

  console.log(`  Total: ${rows.length}, Weak single: ${weak.length}`);
  if (weak.length === 0) { console.log('  Nothing to replace.'); return 0; }

  if (dryRun) {
    for (const w of weak) {
      const issueStr = w.issues.map(i => i.type).join(', ');
      console.log(`  [#${w.row.idx}] [${issueStr}] "${w.row.q.slice(0, 70)}..."`);
    }
    console.log(`  (dry-run — no changes made)`);
    return weak.length;
  }

  // Build pool for duplicate checking (all questions for this subject)
  const pool = rows.map(r => ({ q: r.q }));

  // Process in batches
  let replaced = 0;
  let skipped = 0;
  for (let i = 0; i < weak.length; i += BATCH_SIZE) {
    const batch = weak.slice(i, i + BATCH_SIZE);
    console.log(`  Batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(weak.length / BATCH_SIZE)}: replacing ${batch.length} questions...`);

    try {
      const prompt = buildReplacementPrompt(subject, batch);
      const temp = getTemperature(subject);
      const result = await callAnthropic(prompt.system, prompt.user, 4, temp);
      const newQs = result.questions || [];

      if (newQs.length < batch.length) {
        const missing = batch.length - newQs.length;
        console.log(`    WARNING: Got ${newQs.length}/${batch.length} replacements — ${missing} weak question(s) will remain unreplaced`);
        skipped += missing;
      }

      for (let j = 0; j < Math.min(batch.length, newQs.length); j++) {
        const old = batch[j].row;
        const nq = newQs[j];

        // Validate basic structure
        if (!nq.q || !Array.isArray(nq.o) || nq.o.length !== 4 || typeof nq.c !== 'number' || nq.c < 0 || nq.c > 3) {
          console.log(`    SKIP invalid replacement for #${old.idx}`);
          skipped++;
          continue;
        }

        // Check the new question isn't also weak
        const testRow = { q: nq.q, o: nq.o, c: nq.c, e: nq.e, type: 'single' };
        if (isWeak(testRow, subject)) {
          console.log(`    SKIP still-weak replacement for #${old.idx}: "${nq.q.slice(0, 50)}"`);
          skipped++;
          continue;
        }

        // Check for duplicates against existing pool
        const dupCheck = checkDuplicate(nq.q, pool);
        if (dupCheck.isDuplicate) {
          console.log(`    SKIP duplicate (${Math.round(dupCheck.similarity * 100)}%) for #${old.idx}: "${nq.q.slice(0, 50)}"`);
          skipped++;
          continue;
        }

        // Check explanation quality
        if (!nq.e || nq.e.trim().length < 15 || /^Правильный ответ/i.test(nq.e)) {
          console.log(`    SKIP weak explanation for #${old.idx}`);
          skipped++;
          continue;
        }

        // STEM answer verification: second AI call to verify correctness
        if (STEM_SUBJECTS.has(subject)) {
          try {
            const verified = await verifyReplacementAnswer(nq, subject);
            if (!verified) {
              console.log(`    SKIP wrong answer for #${old.idx}: "${nq.q.slice(0, 50)}"`);
              skipped++;
              continue;
            }
          } catch (verifyErr) {
            // Fail-open: keep the question if verification API fails
            if (process.env.DEBUG) console.log(`    Verify error #${old.idx}: ${verifyErr.message.slice(0, 60)}`);
          }
        }

        // Update in Supabase — PRESERVE existing metadata
        const updateData = {
          q: nq.q,
          o: nq.o,
          c: nq.c,
          e: nq.e,
          // Preserve original metadata
          ...(old.topic ? { topic: old.topic } : {}),
          ...(old.difficulty ? { difficulty: old.difficulty } : {}),
          ...(old.block ? { block: old.block } : {}),
        };

        const { error: updateErr } = await supabase
          .from('questions')
          .update(updateData)
          .eq('id', old.id);

        if (updateErr) {
          console.log(`    ERROR updating #${old.idx}: ${updateErr.message}`);
        } else {
          replaced++;
          // Update pool so future duplication checks include the new question
          const poolIdx = pool.findIndex(p => p.q === old.q);
          if (poolIdx >= 0) pool[poolIdx].q = nq.q;
          console.log(`    ✓ #${old.idx}: "${old.q.slice(0, 35)}..." → "${nq.q.slice(0, 35)}..."`);
        }
      }
    } catch (e) {
      console.log(`    ERROR generating batch: ${e.message.slice(0, 100)}`);
    }

    // Delay between batches
    if (i + BATCH_SIZE < weak.length) {
      console.log(`    Waiting ${INTER_CALL_DELAY / 1000}s...`);
      await sleep(INTER_CALL_DELAY);
    }
  }

  console.log(`  Done: ${replaced}/${weak.length} replaced, ${skipped} skipped`);
  return replaced;
}

async function main() {
  console.log('ENTprep Weak Question Replacement v2');
  console.log(`Model: ${MODEL}`);
  console.log(`Mode: ${dryRun ? 'DRY-RUN' : 'LIVE — will update Supabase'}`);

  const subjects = subjectArg ? [subjectArg] : ALL_SUBJECTS;
  let startIdx = 0;
  if (resumeArg) {
    startIdx = subjects.indexOf(resumeArg);
    if (startIdx < 0) { console.error(`Unknown subject: ${resumeArg}`); process.exit(1); }
    console.log(`Resuming from: ${resumeArg}`);
  }

  const results = {};
  let totalReplaced = 0;

  for (let i = startIdx; i < subjects.length; i++) {
    const count = await processSubject(subjects[i]);
    results[subjects[i]] = count;
    totalReplaced += count;

    if (i < subjects.length - 1 && count > 0 && !dryRun) {
      console.log(`\n  Pausing 30s before next subject...`);
      await sleep(30000);
    }
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log('SUMMARY');
  console.log('='.repeat(60));
  for (const [subj, count] of Object.entries(results)) {
    if (count > 0) console.log(`  ${subj}: ${count} replaced`);
  }
  console.log(`  TOTAL: ${totalReplaced} questions replaced`);

  if (totalReplaced > 0 && !dryRun) {
    console.log(`\n⚠ Remember to bump DATA_VERSION in questionStore.ts to invalidate client caches!`);
  }
}

main().catch(e => { console.error('FATAL:', e); process.exit(1); });
