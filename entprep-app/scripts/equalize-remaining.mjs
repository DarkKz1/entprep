// Equalize remaining subjects: law, literature, reading_passages
import { fileURLToPath, pathToFileURL } from 'url';
import { dirname, join } from 'path';
import { writeFileSync, readFileSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const srcDir = join(__dirname, '..', 'src');
const toURL = (p) => pathToFileURL(p).href;

const OPENAI_KEY = process.env.OPENAI_API_KEY;
if (!OPENAI_KEY) { console.error('Set OPENAI_API_KEY'); process.exit(1); }

const RATIO_THRESHOLD = 1.5;
const MODEL = 'gpt-4o-mini';
const CONCURRENCY = 5;

const SUBJECTS = {
  law: { file: 'data/questions/law.js', exp: 'LAW' },
  literature: { file: 'data/questions/literature.js', exp: 'LIT' },
};

function isFlagged(q) {
  const correctLen = q.o[q.c].length;
  const wrongLens = q.o.filter((_, i) => i !== q.c).map(o => o.length);
  const avgWrong = wrongLens.reduce((a, b) => a + b, 0) / wrongLens.length;
  return avgWrong > 0 && correctLen > avgWrong * RATIO_THRESHOLD;
}

function escapeStr(s) {
  return s.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');
}

function questionToLine(q) {
  const opts = q.o.map(o => `"${escapeStr(o)}"`).join(',');
  const ePart = q.e ? `,e:"${escapeStr(q.e)}"` : '';
  return `{q:"${escapeStr(q.q)}",o:[${opts}],c:${q.c}${ePart}}`;
}

async function fixOneQuestion(q) {
  const labels = ['А', 'Б', 'В', 'Г'];
  const correctLabel = labels[q.c];
  const prompt = `Тестовый вопрос ЕНТ. Правильный ответ (${correctLabel}) длиннее остальных — ученик может угадать по длине.

Вопрос: ${q.q}
А) ${q.o[0]}
Б) ${q.o[1]}
В) ${q.o[2]}
Г) ${q.o[3]}
Правильный: ${correctLabel}

ЗАДАЧА: Перепиши ТОЛЬКО неправильные варианты, чтобы ВСЕ 4 были одинаковой длины и стиля. Правильный ответ (${correctLabel}) оставь БЕЗ изменений.

ПРАВИЛА:
- НЕ добавляй объяснения типа "это неверно потому что..."
- Просто дополни короткие варианты деталями в том же стиле что и правильный
- Если правильный содержит перечисление через запятую — сделай такое же в неправильных
- Если правильный содержит скобки — добавь скобки к неправильным
- Варианты должны быть краткими, как в реальном тесте

Верни JSON: {"o":["А","Б","В","Г"]}`;

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${OPENAI_KEY}` },
    body: JSON.stringify({ model: MODEL, messages: [{ role: 'user', content: prompt }], max_tokens: 300, temperature: 0.3, response_format: { type: 'json_object' } }),
  });
  if (!res.ok) throw new Error(`OpenAI ${res.status}`);
  const data = await res.json();
  const parsed = JSON.parse(data.choices?.[0]?.message?.content?.trim());
  const newO = parsed.o || parsed.options || parsed.variants;
  if (!Array.isArray(newO) || newO.length !== 4) return null;
  if (newO[q.c] !== q.o[q.c]) newO[q.c] = q.o[q.c];
  return newO;
}

async function processPool(items, fn, concurrency) {
  const results = new Array(items.length);
  let idx = 0;
  const workers = Array.from({ length: concurrency }, async () => {
    while (idx < items.length) { const i = idx++; results[i] = await fn(items[i], i); }
  });
  await Promise.all(workers);
  return results;
}

async function processSubject(sid, questions) {
  const flagged = [];
  for (let i = 0; i < questions.length; i++) {
    if (isFlagged(questions[i])) flagged.push({ idx: i, q: questions[i] });
  }
  if (flagged.length === 0) { console.log(`  ${sid}: 0 flagged — skip`); return null; }

  console.log(`  ${sid}: ${flagged.length} flagged, processing...`);
  const updated = questions.map(q => ({ ...q }));
  let fixed = 0, errors = 0;

  await processPool(flagged, async (item) => {
    try {
      const newO = await fixOneQuestion(item.q);
      if (newO) { updated[item.idx] = { ...item.q, o: newO }; fixed++; }
      if ((fixed + errors) % 10 === 0) process.stdout.write(`    ${fixed + errors}/${flagged.length}\r`);
    } catch { errors++; }
  }, CONCURRENCY);

  console.log(`  ${sid}: ${fixed}/${flagged.length} fixed (${errors} errors)`);
  return fixed > 0 ? updated : null;
}

function writeSubjectFile(sid, info, questions) {
  const filePath = join(srcDir, info.file);
  const original = readFileSync(filePath, 'utf-8');
  const lines = original.split('\n');
  const header = [];
  for (const l of lines) { if (l.startsWith('//')) header.push(l); else break; }
  const headerStr = header.length > 0 ? header.join('\n') + '\n' : '';
  const qLines = questions.map(q => questionToLine(q));
  const content = `${headerStr}const ${info.exp} = [\n${qLines.join(',\n')},\n];\n\nexport { ${info.exp} };\n`;
  writeFileSync(filePath, content, 'utf-8');
  console.log(`  -> wrote ${filePath}`);
}

async function processReading() {
  const { RP } = await import(toURL(join(srcDir, 'data/questions/reading_passages.js')));
  let totalFlagged = 0, totalFixed = 0;
  const updatedPassages = JSON.parse(JSON.stringify(RP));

  for (let pi = 0; pi < updatedPassages.length; pi++) {
    const passage = updatedPassages[pi];
    const flagged = [];
    for (let qi = 0; qi < passage.qs.length; qi++) {
      if (isFlagged(passage.qs[qi])) flagged.push({ idx: qi, q: passage.qs[qi] });
    }
    if (flagged.length === 0) continue;
    totalFlagged += flagged.length;
    await processPool(flagged, async (item) => {
      try {
        const newO = await fixOneQuestion(item.q);
        if (newO) { passage.qs[item.idx] = { ...item.q, o: newO }; totalFixed++; }
      } catch {}
    }, CONCURRENCY);
  }

  if (totalFixed > 0) {
    console.log(`  reading: ${totalFixed}/${totalFlagged} fixed`);
    const filePath = join(srcDir, 'data/questions/reading_passages.js');
    const original = readFileSync(filePath, 'utf-8');
    const lines = original.split('\n');
    const header = [];
    for (const l of lines) { if (l.startsWith('//')) header.push(l); else break; }
    const headerStr = header.length > 0 ? header.join('\n') + '\n' : '';
    const passageLines = updatedPassages.map(p => {
      const qLines = p.qs.map(q => questionToLine(q)).join(',\n');
      return `{t:"${escapeStr(p.t)}",tx:"${escapeStr(p.tx)}",qs:[\n${qLines},\n]}`;
    });
    const content = `${headerStr}const RP = [\n${passageLines.join(',\n')},\n];\n\nexport { RP };\n`;
    writeFileSync(filePath, content, 'utf-8');
    console.log(`  -> wrote ${filePath}`);
  } else {
    console.log(`  reading: 0 flagged — skip`);
  }
}

async function main() {
  console.log('=== Equalizing remaining subjects ===\n');
  for (const [sid, info] of Object.entries(SUBJECTS)) {
    const mod = await import(toURL(join(srcDir, info.file)));
    const questions = [...mod[info.exp]];
    const updated = await processSubject(sid, questions);
    if (updated) writeSubjectFile(sid, info, updated);
  }
  console.log('\nProcessing reading passages...');
  await processReading();
  console.log('\n=== Done! ===');
}

main().catch(err => { console.error(err); process.exit(1); });
