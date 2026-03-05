#!/usr/bin/env node
/**
 * AI-powered Kazakh translation for ENTprep questions.
 *
 * Takes an exported batch from translate-export.mjs and translates it via Claude API.
 * Outputs a _kk.json file ready for translate-import.mjs.
 *
 * Usage:
 *   ANTHROPIC_API_KEY=x node scripts/translate-ai.mjs translations/math_batch_001.json
 *   ANTHROPIC_API_KEY=x node scripts/translate-ai.mjs translations/math_batch_001.json --batch-size=5 --model=haiku
 *
 * Options:
 *   --batch-size=N   Questions per API call (default: 5, max: 10)
 *   --model=MODEL    haiku | sonnet | opus (default: sonnet)
 *   --dry-run        Show prompt without calling API
 *   --resume         Skip already-translated questions (if output file exists)
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { AI_MODEL, MODEL_ALIASES } from './utils/constants.mjs';

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';

// ── Parse CLI args ──────────────────────────────────────────────────────────

const file = process.argv[2];
const args = Object.fromEntries(
  process.argv.slice(3).map(a => {
    const [k, v] = a.replace(/^--/, '').split('=');
    return [k, v ?? true];
  })
);

if (!file) {
  console.error('Usage: node translate-ai.mjs <exported_batch.json> [--batch-size=5] [--model=sonnet] [--dry-run] [--resume]');
  process.exit(1);
}

const apiKey = process.env.ANTHROPIC_API_KEY;
if (!apiKey && !args['dry-run']) {
  console.error('Error: ANTHROPIC_API_KEY required');
  process.exit(1);
}

const batchSize = Math.min(10, Math.max(1, parseInt(args['batch-size'] || '5', 10)));
const modelKey = args.model || 'sonnet';
const model = MODEL_ALIASES[modelKey] || AI_MODEL;
const dryRun = !!args['dry-run'];
const resume = !!args.resume;

// ── Load input ──────────────────────────────────────────────────────────────

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

const outFile = file.replace('.json', '_kk.json');

// ── Resume support ──────────────────────────────────────────────────────────

let translated = [];
const doneIds = new Set();

if (resume && existsSync(outFile)) {
  try {
    translated = JSON.parse(readFileSync(outFile, 'utf8'));
    translated.forEach(t => doneIds.add(t.id));
    console.log(`Resuming: ${doneIds.size} already translated\n`);
  } catch {}
}

const remaining = items.filter(item => !doneIds.has(item.id));
console.log(`Input: ${items.length} questions, ${remaining.length} to translate`);
console.log(`Model: ${model}, batch size: ${batchSize}\n`);

if (remaining.length === 0) {
  console.log('All questions already translated!');
  process.exit(0);
}

// ── Translation prompt ──────────────────────────────────────────────────────

const SYSTEM_PROMPT = `Ты профессиональный переводчик учебных материалов с русского на казахский язык.

ПРАВИЛА ПЕРЕВОДА:
- Переводи ТОЧНО и ПОЛНОСТЬЮ — не пропускай и не добавляй информацию
- Сохраняй научную терминологию на казахском языке (официальные термины из казахских учебников)
- Числа, формулы, единицы измерения, химические формулы — оставляй без изменений
- Unicode символы (², ³, √, π, ×, ÷, ≈, →) — оставляй без изменений
- Имена собственные: используй казахский вариант написания, если он общеизвестен (Абай, Алматы), иначе транслитерируй
- Количество вариантов ответа должно ТОЧНО совпадать с оригиналом
- Для matching вопросов: переводи каждую пару [left, right] отдельно
- Язык должен быть естественным и грамотным казахским, НЕ дословный перевод

ФОРМАТ ОТВЕТА:
Верни строго JSON массив (без markdown, без \`\`\`). Каждый элемент:
{
  "id": <оригинальный id>,
  "q_kk": "перевод вопроса",
  "o_kk": ["вариант 1", "вариант 2", ...],  // для single/multiple
  "e_kk": "перевод объяснения",
  "pairs_kk": [["left","right"], ...],       // только для matching
  "passage_title_kk": "...",                  // только если есть passage_title
  "passage_text_kk": "..."                    // только если есть passage_text
}

Не включай поля, которых нет в оригинале (не добавляй o_kk для matching, не добавляй pairs_kk для single).`;

function buildUserMessage(batch) {
  const formatted = batch.map((item, i) => {
    const parts = [`--- Вопрос ${i + 1} (id: ${item.id}) ---`];
    parts.push(`Тип: ${item.type || 'single'}`);
    parts.push(`Вопрос: ${item.q}`);

    if (item.pairs) {
      parts.push('Пары:');
      item.pairs.forEach(([l, r], j) => parts.push(`  ${j + 1}. ${l} → ${r}`));
    } else if (item.o) {
      item.o.forEach((opt, j) => parts.push(`${['А', 'Б', 'В', 'Г', 'Д', 'Е'][j]}) ${opt}`));
    }

    parts.push(`Объяснение: ${item.e}`);

    if (item.passage_title) parts.push(`Заголовок текста: ${item.passage_title}`);
    if (item.passage_text) parts.push(`Текст: ${item.passage_text}`);

    return parts.join('\n');
  });

  return `Переведи следующие ${batch.length} вопросов на казахский язык:\n\n${formatted.join('\n\n')}\n\nВерни JSON массив с ${batch.length} элементами.`;
}

// ── API call ────────────────────────────────────────────────────────────────

async function callClaude(batch) {
  const userMessage = buildUserMessage(batch);

  if (dryRun) {
    console.log('=== PROMPT ===');
    console.log(userMessage.substring(0, 2000) + '...\n');
    return null;
  }

  // Estimate needed tokens: ~1.5x input length for translation output
  const inputChars = userMessage.length;
  const estimatedTokens = Math.max(4096, Math.min(16000, Math.ceil(inputChars / 2)));

  const res = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: estimatedTokens,
      temperature: 0.3,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`API ${res.status}: ${errText.substring(0, 300)}`);
  }

  const data = await res.json();
  let raw = data.content?.[0]?.text?.trim() || '';
  raw = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();

  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed)) throw new Error('Expected JSON array');
  return parsed;
}

// ── Validate translation ────────────────────────────────────────────────────

function validateTranslation(original, translation) {
  const errors = [];
  if (!translation.q_kk || translation.q_kk.length < 5) errors.push('q_kk too short');
  if (!translation.e_kk || translation.e_kk.length < 5) errors.push('e_kk too short');

  const qType = original.type || 'single';
  if (qType === 'matching') {
    if (!Array.isArray(translation.pairs_kk)) errors.push('missing pairs_kk');
    else if (original.pairs && translation.pairs_kk.length !== original.pairs.length) {
      errors.push(`pairs_kk count mismatch: ${translation.pairs_kk.length} vs ${original.pairs.length}`);
    }
  } else {
    if (!Array.isArray(translation.o_kk)) errors.push('missing o_kk');
    else if (original.o && translation.o_kk.length !== original.o.length) {
      errors.push(`o_kk count mismatch: ${translation.o_kk.length} vs ${original.o.length}`);
    }
  }

  return errors;
}

// ── Main loop ───────────────────────────────────────────────────────────────

async function main() {
  let succeeded = 0;
  let failed = 0;

  for (let i = 0; i < remaining.length; i += batchSize) {
    const batch = remaining.slice(i, i + batchSize);
    const batchNum = Math.floor(i / batchSize) + 1;
    const totalBatches = Math.ceil(remaining.length / batchSize);

    process.stdout.write(`Batch ${batchNum}/${totalBatches} (${batch.length} questions)... `);

    try {
      const results = await callClaude(batch);
      if (!results) continue; // dry-run

      for (const tr of results) {
        const original = batch.find(b => b.id === tr.id);
        if (!original) {
          console.error(`  Warning: translated id=${tr.id} not found in batch`);
          failed++;
          continue;
        }

        const vErrors = validateTranslation(original, tr);
        if (vErrors.length > 0) {
          console.error(`  id=${tr.id}: ${vErrors.join(', ')}`);
          failed++;
          continue;
        }

        // Build clean output
        const out = { id: tr.id, q_kk: tr.q_kk, e_kk: tr.e_kk, type: original.type || 'single' };
        if (tr.o_kk) out.o_kk = tr.o_kk;
        if (tr.pairs_kk) out.pairs_kk = tr.pairs_kk;
        if (tr.passage_title_kk) out.passage_title_kk = tr.passage_title_kk;
        if (tr.passage_text_kk) out.passage_text_kk = tr.passage_text_kk;

        translated.push(out);
        succeeded++;
      }

      // Save after each batch (crash-safe)
      writeFileSync(outFile, JSON.stringify(translated, null, 2), 'utf8');
      console.log(`OK (${succeeded} total)`);

      // Rate limit: wait 1s between batches
      if (i + batchSize < remaining.length) {
        await new Promise(r => setTimeout(r, 1000));
      }
    } catch (err) {
      console.error(`FAILED: ${err.message}`);
      failed += batch.length;

      // Save progress even on failure
      if (translated.length > 0) {
        writeFileSync(outFile, JSON.stringify(translated, null, 2), 'utf8');
      }

      // If rate limited, wait longer
      if (err.message.includes('429')) {
        console.log('  Rate limited, waiting 30s...');
        await new Promise(r => setTimeout(r, 30000));
      }
    }
  }

  if (!dryRun) {
    console.log(`\nDone: ${succeeded} translated, ${failed} failed`);
    console.log(`Output: ${outFile}`);
    console.log(`\nNext step: node scripts/translate-import.mjs ${outFile} --subject=<id>`);
  }
}

main().catch(err => { console.error(err); process.exit(1); });
