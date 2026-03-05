// ENTprep Question Fix Script
// Fixes: letter prefixes, c-distribution, duplicate options, short explanations
//
// Usage:
//   SUPABASE_URL=x SUPABASE_SERVICE_KEY=y node scripts/fix-questions.mjs --dry-run
//   SUPABASE_URL=x SUPABASE_SERVICE_KEY=y node scripts/fix-questions.mjs --apply
//   SUPABASE_URL=x SUPABASE_SERVICE_KEY=y node scripts/fix-questions.mjs --apply --subject=physics

import { createClient } from "@supabase/supabase-js";

// ── CLI ──────────────────────────────────────────────────────────────────────

const ARGS = process.argv.slice(2);
const DRY_RUN = !ARGS.includes("--apply");
const SUBJECT_FILTER = ARGS.find((a) => a.startsWith("--subject="))?.split("=")[1] || null;

if (DRY_RUN) console.log("🔍 DRY RUN — no changes will be made. Use --apply to write.\n");

// ── Supabase ─────────────────────────────────────────────────────────────────

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_KEY;
if (!url || !key) {
  console.error("Error: SUPABASE_URL and SUPABASE_SERVICE_KEY required");
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

// ── Fix 1: Strip letter prefixes ─────────────────────────────────────────────

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

// ── Fix 2: C-distribution rebalance ──────────────────────────────────────────

// Fisher-Yates with seeded PRNG (deterministic per question id)
function seededRandom(seed) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0;
  }
  return function () {
    h = (Math.imul(h, 1103515245) + 12345) | 0;
    return ((h >>> 16) & 0x7fff) / 0x7fff;
  };
}

function shuffleWithCorrect(options, correctIdx, questionId) {
  // Create indices [0,1,2,3], shuffle deterministically, return new options + new c
  const n = options.length;
  const indices = Array.from({ length: n }, (_, i) => i);
  const rng = seededRandom(questionId);

  // Fisher-Yates
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }

  const newOptions = indices.map((i) => options[i]);
  const newCorrect = indices.indexOf(correctIdx);
  return { newOptions, newCorrect };
}

// ── Fix 3: Duplicate options ─────────────────────────────────────────────────

const DUPLICATE_OPTION_FIXES = {
  // english[46]: "Choosed" appears in A and D → D should be "Choicing"
  "f211dd22-2bbc-4bb0-bae5-c9ceeffa1520": {
    o: ["Choosed", "Choosen", "Chose", "Choicing"],
    c: 2,
    e: "Choose — неправильный глагол. Формы: choose → chose (Past Simple) → chosen (Past Participle). Choosed и Choicing — ошибочные формы, не существующие в английском языке.",
  },
  // informatics[78]: "истина, если оба операнда истинны" appears twice → D should be different
  "cc7e3dc0-7102-413e-83df-f05ad84cd8be": {
    o: [
      "истина, если операнды различны",
      "истина, если оба операнда истинны",
      "истина, если оба операнда ложны",
      "всегда истина, если хотя бы один операнд истинен",
    ],
    c: 0,
    e: "XOR (исключающее ИЛИ) возвращает истину только когда операнды различны: 1⊕0=1, 0⊕1=1, но 1⊕1=0, 0⊕0=0. В отличие от обычного OR, XOR = ложь при одинаковых операндах.",
  },
  // math_profile[48]: "1/(2√x)" appears twice → B should be different
  "6106a215-e960-433f-ba1e-8455cc6a0396": {
    o: ["1/(2√x)", "2√x", "(√x)/2", "1/√x"],
    c: 0,
    e: "(√x)' = (x^½)' = (1/2)·x^(−1/2) = 1/(2√x). По формуле степенной производной: (x^n)' = n·x^(n−1).",
  },
  // math_profile[111]: "x=−1 (макс), x=1 (мин)" appears twice → C should be different
  "4dbee807-6e61-401d-bd25-46a34cbc78aa": {
    o: [
      "x=−1 (макс), x=1 (мин)",
      "x=0 (макс)",
      "x=−1 (мин), x=1 (макс)",
      "x=±√3 (мин, макс)",
    ],
    c: 0,
    e: "f'(x) = 3x²−3 = 0 → x = ±1. f''(x) = 6x. f''(−1) = −6 < 0 → максимум в x = −1. f''(1) = 6 > 0 → минимум в x = 1.",
  },
};

// biology[27]: АА/аа NOT a real duplicate — case matters in genetics. Skip.

// ── Fix 4: Short explanations ────────────────────────────────────────────────

const SHORT_EXPLANATION_FIXES = {
  // math_profile[74]: P₄=4!=24
  "079a55d8-c0a5-4ae3-8f6d-1c6ae1c9a593":
    "Число перестановок из n элементов вычисляется как n! (n факториал). P₄ = 4! = 4 × 3 × 2 × 1 = 24. Перестановки показывают, сколькими способами можно расположить все элементы в ряд.",
  // math_profile[75]: P=3/10=0.3
  "8a99464c-f9c8-4175-9158-82fb3b0b17e1":
    "Вероятность события = число благоприятных исходов / общее число исходов. Всего шаров: 3 + 7 = 10. Белых: 3. P(белый) = 3/10 = 0.3 = 30%. Формула классической вероятности: P(A) = m/n.",
  // math_profile[83]: C=2πR=14π
  "260466d3-2fd4-4934-b980-7993734bfc17":
    "Длина окружности вычисляется по формуле C = 2πR, где R — радиус. C = 2π × 7 = 14π ≈ 43.98. Также можно записать C = πd, где d = 2R — диаметр.",
  // math_profile[84]: S=πR²=25π
  "f3b9c741-72be-4329-a6d3-6bc51bf39c46":
    "Площадь круга вычисляется по формуле S = πR², где R — радиус. S = π × 5² = 25π ≈ 78.54. Не путать с длиной окружности C = 2πR.",
  // math_profile[85]: d=a√2=6√2
  "2be06af1-7885-45d3-a76e-c6f9af506600":
    "Диагональ квадрата d = a√2, где a — сторона. d = 6√2 ≈ 8.49. Это следует из теоремы Пифагора: d² = a² + a² = 2a², значит d = a√2.",
  // math_profile[92]: V=a³=4³=64
  "c9b4609e-cf63-4485-b156-f88e46b6421d":
    "Объём куба вычисляется по формуле V = a³, где a — длина ребра. V = 4³ = 4 × 4 × 4 = 64. Площадь поверхности куба: S = 6a² = 6 × 16 = 96.",
  // reading[56]: «На 25%».
  "3ee492c7-0cab-4223-86b1-9e01394310cd":
    "Ответ содержится в тексте пассажа: рост за год составил 25%. Это прямая информация из текста, требующая внимательного чтения числовых данных.",
  // reading[81]: «35% ВВП».
  "4da27ba4-8aa6-42cc-b92c-521d76713dd2":
    "Согласно тексту, доля малого бизнеса составляет 35% ВВП. Для ответа на этот вопрос нужно найти в пассаже конкретные процентные данные о вкладе малого бизнеса.",
  // reading[84]: «37 лет».
  "8dedce51-dc26-4c05-ba19-4198e8dbacc2":
    "В тексте указано, что средний возраст предпринимателя составляет 37 лет. Вопрос проверяет умение находить конкретные числовые факты в тексте.",
};

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("╔══════════════════════════════════════════════════════╗");
  console.log("║         ENTprep Question Fix Script                  ║");
  console.log("╚══════════════════════════════════════════════════════╝\n");

  // 1. Fetch all questions
  console.log("1) Fetching questions...");
  const selectCols = "id,subject,idx,q,o,c,e";
  let allQuestions;
  if (SUBJECT_FILTER) {
    allQuestions = await fetchAll("questions", selectCols, { subject: SUBJECT_FILTER });
  } else {
    allQuestions = await fetchAll("questions", selectCols);
  }
  console.log(`   ${allQuestions.length} questions loaded\n`);

  // Group by subject
  const bySubject = {};
  for (const q of allQuestions) {
    if (!bySubject[q.subject]) bySubject[q.subject] = [];
    bySubject[q.subject].push(q);
  }

  // Stats
  const stats = {
    prefixFixed: 0,
    cRebalanced: 0,
    dupeOptionsFixed: 0,
    explanationsFixed: 0,
    totalUpdates: 0,
  };

  // Collect updates: Map<id, {field: value}>
  const updates = new Map();

  function addUpdate(id, fields) {
    const existing = updates.get(id) || {};
    updates.set(id, { ...existing, ...fields });
  }

  // ── Fix 1: Strip letter prefixes ───────────────────────────────────────
  console.log("2) Checking letter prefixes...");
  for (const q of allQuestions) {
    if (!Array.isArray(q.o)) continue;
    const fixed = stripPrefixes(q.o);
    if (fixed) {
      addUpdate(q.id, { o: fixed });
      stats.prefixFixed++;
    }
  }
  console.log(`   ${stats.prefixFixed} questions have letter prefixes to strip\n`);

  // ── Fix 2: C-distribution rebalance ────────────────────────────────────
  console.log("3) Checking c-distribution...");

  for (const [subject, questions] of Object.entries(bySubject)) {
    // Only single-type questions with exactly 4 options
    const singles = questions.filter(
      (q) => (!q.type || q.type === "single") && Array.isArray(q.o) && q.o.length === 4
    );

    // Current distribution
    const dist = [0, 0, 0, 0];
    for (const q of singles) {
      if (Number.isInteger(q.c) && q.c >= 0 && q.c <= 3) dist[q.c]++;
    }
    const total = singles.length;
    const ideal = total / 4;
    const maxPct = (Math.max(...dist) / total) * 100;

    if (maxPct <= 30) continue; // Already balanced enough

    // Need to rebalance: target ~25% each
    // Assign each question a target c-slot to reach even distribution
    const targetDist = [
      Math.round(ideal),
      Math.round(ideal),
      Math.round(ideal),
      total - 3 * Math.round(ideal),
    ];
    const currentSlots = [[], [], [], []]; // questions currently in each c-slot
    for (const q of singles) {
      if (Number.isInteger(q.c) && q.c >= 0 && q.c <= 3) {
        currentSlots[q.c].push(q);
      }
    }

    let moved = 0;
    // For each over-represented slot, move excess questions to under-represented slots
    for (let fromSlot = 0; fromSlot < 4; fromSlot++) {
      const excess = currentSlots[fromSlot].length - targetDist[fromSlot];
      if (excess <= 0) continue;

      // Find under-represented slots
      let toMove = excess;
      for (let toSlot = 0; toSlot < 4 && toMove > 0; toSlot++) {
        if (toSlot === fromSlot) continue;
        const deficit = targetDist[toSlot] - currentSlots[toSlot].length;
        if (deficit <= 0) continue;

        const moveCount = Math.min(toMove, deficit);
        for (let i = 0; i < moveCount; i++) {
          const q = currentSlots[fromSlot].pop();
          if (!q) break;

          // Get current options (possibly already prefix-stripped)
          const currentO = updates.get(q.id)?.o || q.o;
          const currentC = q.c;

          // Swap correct answer to target slot
          const newO = [...currentO];
          [newO[currentC], newO[toSlot]] = [newO[toSlot], newO[currentC]];
          const newC = toSlot;

          addUpdate(q.id, { o: newO, c: newC });
          currentSlots[toSlot].push(q);
          moved++;
          toMove--;
        }
      }
    }

    if (moved > 0) {
      const newDist = currentSlots.map((s) => s.length);
      console.log(
        `   ${subject}: moved ${moved} questions. Dist: [${dist.join(",")}] → [${newDist.join(",")}]`
      );
      stats.cRebalanced += moved;
    }
  }
  console.log(`   ${stats.cRebalanced} questions rebalanced\n`);

  // ── Fix 3: Duplicate options ───────────────────────────────────────────
  console.log("4) Fixing duplicate options...");
  for (const [id, fix] of Object.entries(DUPLICATE_OPTION_FIXES)) {
    const q = allQuestions.find((q) => q.id === id);
    if (!q) {
      console.log(`   ⚠️  ${id}: question not found (skipping)`);
      continue;
    }
    addUpdate(id, { o: fix.o, c: fix.c, e: fix.e });
    stats.dupeOptionsFixed++;
    console.log(`   ✓ ${q.subject}[${q.idx}]: fixed duplicate options`);
  }
  console.log(`   ${stats.dupeOptionsFixed} fixed\n`);

  // ── Fix 4: Short explanations ──────────────────────────────────────────
  console.log("5) Fixing short explanations...");
  for (const [id, newExplanation] of Object.entries(SHORT_EXPLANATION_FIXES)) {
    const q = allQuestions.find((q) => q.id === id);
    if (!q) {
      console.log(`   ⚠️  ${id}: question not found (skipping)`);
      continue;
    }
    addUpdate(id, { e: newExplanation });
    stats.explanationsFixed++;
    console.log(`   ✓ ${q.subject}[${q.idx}]: expanded explanation`);
  }
  console.log(`   ${stats.explanationsFixed} fixed\n`);

  // ── Apply updates ──────────────────────────────────────────────────────
  stats.totalUpdates = updates.size;
  console.log(`\n══════════════════════════════════════════════════════`);
  console.log(`TOTAL: ${stats.totalUpdates} questions to update`);
  console.log(`  - Prefix strips: ${stats.prefixFixed}`);
  console.log(`  - C-rebalanced: ${stats.cRebalanced}`);
  console.log(`  - Dupe options fixed: ${stats.dupeOptionsFixed}`);
  console.log(`  - Explanations expanded: ${stats.explanationsFixed}`);
  console.log(`══════════════════════════════════════════════════════\n`);

  if (DRY_RUN) {
    console.log("🔍 DRY RUN complete. Use --apply to write changes to Supabase.\n");

    // Show a few sample updates
    let shown = 0;
    for (const [id, fields] of updates) {
      if (shown >= 5) break;
      const q = allQuestions.find((q) => q.id === id);
      console.log(`  Sample: ${q?.subject}[${q?.idx}] → ${JSON.stringify(fields).slice(0, 120)}...`);
      shown++;
    }
    return;
  }

  // Apply in batches
  console.log("Applying updates to Supabase...");
  let applied = 0;
  let errors = 0;

  // Process in batches of 50 (Supabase doesn't support bulk update, so one-by-one)
  const entries = [...updates.entries()];
  for (let i = 0; i < entries.length; i++) {
    const [id, fields] = entries[i];
    const { error } = await sb.from("questions").update(fields).eq("id", id);
    if (error) {
      const q = allQuestions.find((q) => q.id === id);
      console.error(`  ❌ ${q?.subject}[${q?.idx}]: ${error.message}`);
      errors++;
    } else {
      applied++;
    }
    if ((i + 1) % 100 === 0) {
      console.log(`  ... ${i + 1}/${entries.length} processed`);
    }
  }

  console.log(`\n✅ Applied: ${applied} | ❌ Errors: ${errors}\n`);
}

main().catch((err) => {
  console.error(`Fatal: ${err.message}`);
  process.exit(1);
});
