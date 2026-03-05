// Generate SQL to fix all question issues (letter prefixes, c-distribution, dupe options, explanations)
// Usage: SUPABASE_URL=x SUPABASE_SERVICE_KEY=y node scripts/generate-fix-sql.mjs

import { createClient } from "@supabase/supabase-js";
import { writeFileSync } from "fs";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_KEY;
if (!url || !key) { console.error("SUPABASE_URL and SUPABASE_SERVICE_KEY required"); process.exit(1); }
const sb = createClient(url, key);

// ── Helpers ──────────────────────────────────────────────────────────────────

const OPTION_PREFIX_RE = /^[АБВГДЕабвгдеABCDEFabcdef]\)\s*/;

function stripPrefixes(options) {
  let changed = false;
  const fixed = options.map((o) => {
    const stripped = o.replace(OPTION_PREFIX_RE, "");
    if (stripped !== o) changed = true;
    return stripped;
  });
  return changed ? fixed : null;
}

function escSql(s) {
  return s.replace(/'/g, "''");
}

async function fetchAll(table, select) {
  const PAGE = 1000;
  const all = [];
  let offset = 0;
  while (true) {
    const { data, error } = await sb.from(table).select(select).range(offset, offset + PAGE - 1);
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < PAGE) break;
    offset += PAGE;
  }
  return all;
}

// ── Hardcoded fixes ──────────────────────────────────────────────────────────

const DUPE_FIXES = {
  "f211dd22-2bbc-4bb0-bae5-c9ceeffa1520": {
    o: ["Choosed", "Choosen", "Chose", "Choicing"],
    c: 2,
    e: "Choose — неправильный глагол. Формы: choose → chose (Past Simple) → chosen (Past Participle). Choosed и Choicing — ошибочные формы.",
  },
  "cc7e3dc0-7102-413e-83df-f05ad84cd8be": {
    o: [
      "истина, если операнды различны",
      "истина, если оба операнда истинны",
      "истина, если оба операнда ложны",
      "всегда истина, если хотя бы один операнд истинен",
    ],
    c: 0,
    e: "XOR (исключающее ИЛИ) возвращает истину только когда операнды различны: 1⊕0=1, 0⊕1=1, но 1⊕1=0, 0⊕0=0.",
  },
  "6106a215-e960-433f-ba1e-8455cc6a0396": {
    o: ["1/(2√x)", "2√x", "(√x)/2", "1/√x"],
    c: 0,
    e: "(√x)' = (x^½)' = (1/2)·x^(−1/2) = 1/(2√x). По формуле степенной производной: (x^n)' = n·x^(n−1).",
  },
  "4dbee807-6e61-401d-bd25-46a34cbc78aa": {
    o: [
      "x=−1 (макс), x=1 (мин)",
      "x=0 (макс)",
      "x=−1 (мин), x=1 (макс)",
      "x=±√3 (мин, макс)",
    ],
    c: 0,
    e: "f'(x)=3x²−3=0 → x=±1. f''(x)=6x. f''(−1)=−6<0 → максимум. f''(1)=6>0 → минимум.",
  },
};

const EXPL_FIXES = {
  "079a55d8-c0a5-4ae3-8f6d-1c6ae1c9a593":
    "Число перестановок из n элементов: n! (n факториал). P₄ = 4! = 4×3×2×1 = 24. Перестановки показывают, сколькими способами можно расположить все элементы в ряд.",
  "8a99464c-f9c8-4175-9158-82fb3b0b17e1":
    "Вероятность = благоприятные исходы / всего исходов. Шаров: 3+7=10. P(белый) = 3/10 = 0.3 = 30%.",
  "260466d3-2fd4-4934-b980-7993734bfc17":
    "Длина окружности C = 2πR. C = 2π×7 = 14π ≈ 43.98. Также C = πd, где d — диаметр.",
  "f3b9c741-72be-4329-a6d3-6bc51bf39c46":
    "Площадь круга S = πR². S = π×5² = 25π ≈ 78.54. Не путать с длиной окружности C = 2πR.",
  "2be06af1-7885-45d3-a76e-c6f9af506600":
    "Диагональ квадрата d = a√2 (теорема Пифагора: d²=a²+a²=2a²). d = 6√2 ≈ 8.49.",
  "c9b4609e-cf63-4485-b156-f88e46b6421d":
    "Объём куба V = a³. V = 4³ = 4×4×4 = 64. Площадь поверхности: S = 6a² = 96.",
  "3ee492c7-0cab-4223-86b1-9e01394310cd":
    "Ответ содержится в тексте пассажа: рост за год составил 25%. Прямая информация из текста.",
  "4da27ba4-8aa6-42cc-b92c-521d76713dd2":
    "Согласно тексту, доля малого бизнеса составляет 35% ВВП. Нужно найти в пассаже конкретные данные.",
  "8dedce51-dc26-4c05-ba19-4198e8dbacc2":
    "В тексте указано, что средний возраст предпринимателя — 37 лет. Вопрос на нахождение конкретных фактов.",
};

// ── Main ─────────────────────────────────────────────────────────────────────

const allQuestions = await fetchAll("questions", "id,subject,idx,q,o,c,e,type");
console.log(`${allQuestions.length} questions fetched`);

const bySubject = {};
for (const q of allQuestions) {
  if (!bySubject[q.subject]) bySubject[q.subject] = [];
  bySubject[q.subject].push(q);
}

const updates = new Map();
function addUpdate(id, fields) {
  const existing = updates.get(id) || {};
  updates.set(id, { ...existing, ...fields });
}

// Fix 1: Strip letter prefixes
let prefixCount = 0;
for (const q of allQuestions) {
  if (!Array.isArray(q.o)) continue;
  const fixed = stripPrefixes(q.o);
  if (fixed) { addUpdate(q.id, { o: fixed }); prefixCount++; }
}
console.log(`Prefix fixes: ${prefixCount}`);

// Fix 2: C-distribution rebalance
let rebalCount = 0;
for (const [subject, questions] of Object.entries(bySubject)) {
  const singles = questions.filter(
    (q) => (!q.type || q.type === "single") && Array.isArray(q.o) && q.o.length === 4
  );
  const dist = [0, 0, 0, 0];
  for (const q of singles) {
    if (Number.isInteger(q.c) && q.c >= 0 && q.c <= 3) dist[q.c]++;
  }
  const total = singles.length;
  const maxPct = (Math.max(...dist) / total) * 100;
  if (maxPct <= 30) continue;

  const ideal = total / 4;
  const targetDist = [
    Math.round(ideal),
    Math.round(ideal),
    Math.round(ideal),
    total - 3 * Math.round(ideal),
  ];
  const currentSlots = [[], [], [], []];
  for (const q of singles) {
    if (Number.isInteger(q.c) && q.c >= 0 && q.c <= 3) currentSlots[q.c].push(q);
  }

  for (let fromSlot = 0; fromSlot < 4; fromSlot++) {
    let excess = currentSlots[fromSlot].length - targetDist[fromSlot];
    if (excess <= 0) continue;
    for (let toSlot = 0; toSlot < 4 && excess > 0; toSlot++) {
      if (toSlot === fromSlot) continue;
      const deficit = targetDist[toSlot] - currentSlots[toSlot].length;
      if (deficit <= 0) continue;
      const moveCount = Math.min(excess, deficit);
      for (let i = 0; i < moveCount; i++) {
        const q = currentSlots[fromSlot].pop();
        if (!q) break;
        const currentO = updates.get(q.id)?.o || q.o;
        const currentC = q.c;
        const newO = [...currentO];
        [newO[currentC], newO[toSlot]] = [newO[toSlot], newO[currentC]];
        addUpdate(q.id, { o: newO, c: toSlot });
        currentSlots[toSlot].push(q);
        excess--;
        rebalCount++;
      }
    }
  }

  const newDist = currentSlots.map((s) => s.length);
  console.log(`  ${subject}: [${dist}] → [${newDist}]`);
}
console.log(`Rebalance fixes: ${rebalCount}`);

// Fix 3: Duplicate options
for (const [id, fix] of Object.entries(DUPE_FIXES)) {
  addUpdate(id, fix);
}
console.log(`Dupe option fixes: ${Object.keys(DUPE_FIXES).length}`);

// Fix 4: Short explanations
for (const [id, e] of Object.entries(EXPL_FIXES)) {
  addUpdate(id, { e });
}
console.log(`Explanation fixes: ${Object.keys(EXPL_FIXES).length}`);

// ── Generate SQL ─────────────────────────────────────────────────────────────

const lines = [
  `-- ENTprep Question Fixes: ${updates.size} updates`,
  `-- Generated: ${new Date().toISOString()}`,
  `-- Fixes: ${prefixCount} prefix strips, ${rebalCount} c-rebalances, ${Object.keys(DUPE_FIXES).length} dupe options, ${Object.keys(EXPL_FIXES).length} explanations`,
  "",
  "BEGIN;",
  "",
];

for (const [id, fields] of updates) {
  const sets = [];
  if (fields.o) sets.push(`o = '${escSql(JSON.stringify(fields.o))}'::jsonb`);
  if (fields.c !== undefined) sets.push(`c = ${fields.c}`);
  if (fields.e) sets.push(`e = '${escSql(fields.e)}'`);
  if (sets.length > 0) {
    lines.push(`UPDATE questions SET ${sets.join(", ")} WHERE id = '${id}';`);
  }
}

lines.push("");
lines.push("COMMIT;");
lines.push("");
lines.push("-- Verify c-distribution after:");
lines.push("-- SELECT subject, c, count(*) FROM questions WHERE type = 'single' OR type IS NULL GROUP BY subject, c ORDER BY subject, c;");

const outPath = "supabase/migrations/fix_questions.sql";
writeFileSync(outPath, lines.join("\n"));
console.log(`\nSQL written to ${outPath} (${updates.size} UPDATE statements, ${lines.length} lines)`);
