// ENTprep Question Validator
// Usage:
//   node scripts/validate-questions.mjs          — validate all questions
//   node scripts/validate-questions.mjs --fix     — fix c-distribution and rewrite files

import { fileURLToPath, pathToFileURL } from 'url';
import { dirname, join } from 'path';
import { readFileSync, writeFileSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const srcDir = join(__dirname, '..', 'src');
const toURL = (p) => pathToFileURL(p).href;

const FIX_MODE = process.argv.includes('--fix');

// ── Import all question files ──────────────────────────────────────────────

const { MQ } = await import(toURL(join(srcDir, 'data/questions/math_literacy.js')));
const { RP } = await import(toURL(join(srcDir, 'data/questions/reading_passages.js')));
const { HQ } = await import(toURL(join(srcDir, 'data/questions/history_kz.js')));
const { GEO } = await import(toURL(join(srcDir, 'data/questions/geography.js')));
const { ENG } = await import(toURL(join(srcDir, 'data/questions/english.js')));
const { MPQ } = await import(toURL(join(srcDir, 'data/questions/math_profile.js')));
const { PHYS } = await import(toURL(join(srcDir, 'data/questions/physics.js')));
const { BIO } = await import(toURL(join(srcDir, 'data/questions/biology.js')));
const { CHEM } = await import(toURL(join(srcDir, 'data/questions/chemistry.js')));
const { WH } = await import(toURL(join(srcDir, 'data/questions/world_history.js')));
const { INFO } = await import(toURL(join(srcDir, 'data/questions/informatics.js')));
const { LAW } = await import(toURL(join(srcDir, 'data/questions/law.js')));
const { LIT } = await import(toURL(join(srcDir, 'data/questions/literature.js')));

// Subject ID → { array, exportName, file, isReading }
const SUBJECTS = {
  math:          { array: MQ,   exportName: 'MQ',   file: 'data/questions/math_literacy.js' },
  reading:       { array: RP,   exportName: 'RP',   file: 'data/questions/reading_passages.js', isReading: true },
  history:       { array: HQ,   exportName: 'HQ',   file: 'data/questions/history_kz.js' },
  geography:     { array: GEO,  exportName: 'GEO',  file: 'data/questions/geography.js' },
  english:       { array: ENG,  exportName: 'ENG',  file: 'data/questions/english.js' },
  math_profile:  { array: MPQ,  exportName: 'MPQ',  file: 'data/questions/math_profile.js' },
  physics:       { array: PHYS, exportName: 'PHYS', file: 'data/questions/physics.js' },
  biology:       { array: BIO,  exportName: 'BIO',  file: 'data/questions/biology.js' },
  chemistry:     { array: CHEM, exportName: 'CHEM', file: 'data/questions/chemistry.js' },
  world_history: { array: WH,   exportName: 'WH',   file: 'data/questions/world_history.js' },
  informatics:   { array: INFO, exportName: 'INFO', file: 'data/questions/informatics.js' },
  law:           { array: LAW,  exportName: 'LAW',  file: 'data/questions/law.js' },
  literature:    { array: LIT,  exportName: 'LIT',  file: 'data/questions/literature.js' },
};

// ── Helpers ────────────────────────────────────────────────────────────────

function cDistribution(questions) {
  const dist = [0, 0, 0, 0];
  for (const q of questions) dist[q.c]++;
  return dist;
}

function maxConsecutive(questions) {
  let maxRun = 1, run = 1, maxVal = questions[0]?.c;
  for (let i = 1; i < questions.length; i++) {
    if (questions[i].c === questions[i - 1].c) {
      run++;
      if (run > maxRun) { maxRun = run; maxVal = questions[i].c; }
    } else {
      run = 1;
    }
  }
  return { maxRun, maxVal };
}

// Strip option letter prefixes like "А) ", "Б) ", "В) ", "Г) " (Cyrillic & Latin)
const OPTION_PREFIX_RE = /^[АБВГабвгABCDabcd]\)\s*/;

function stripOptionPrefix(text) {
  return text.replace(OPTION_PREFIX_RE, '');
}

function hasOptionPrefixes(questions) {
  for (const q of questions) {
    for (const o of q.o) {
      if (OPTION_PREFIX_RE.test(o)) return true;
    }
  }
  return false;
}

function stripPrefixesFromQuestion(q) {
  return { ...q, o: q.o.map(o => stripOptionPrefix(o)) };
}

// Fisher-Yates shuffle
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Flatten reading passages to flat question array
function flattenReading(rp) {
  const qs = [];
  for (const passage of rp) {
    for (const q of passage.qs) qs.push(q);
  }
  return qs;
}

// ── Validation ─────────────────────────────────────────────────────────────

function validateQuestion(q, idx, subjectId) {
  const criticals = [];
  const warnings = [];

  // C1: q non-empty > 5 chars
  if (!q.q || q.q.trim().length <= 5) criticals.push(`C1: q empty or ≤5 chars (idx ${idx})`);

  // C2: exactly 4 options
  if (!Array.isArray(q.o) || q.o.length !== 4) {
    criticals.push(`C2: options count ≠ 4 (idx ${idx}, got ${q.o?.length})`);
  } else {
    // C3: options non-empty
    for (let i = 0; i < 4; i++) {
      if (!q.o[i] || q.o[i].trim().length === 0) {
        criticals.push(`C3: option[${i}] empty (idx ${idx})`);
      }
    }
    // C6: no duplicate options (exact match, trimmed)
    const trimmed = q.o.map(o => (o || '').trim());
    const unique = new Set(trimmed);
    if (unique.size < 4) criticals.push(`C6: duplicate options (idx ${idx})`);
  }

  // C4: c in range [0,3]
  if (!Number.isInteger(q.c) || q.c < 0 || q.c > 3) {
    criticals.push(`C4: c=${q.c} out of range (idx ${idx})`);
  }

  // C5: explanation > 10 chars
  if (!q.e || q.e.trim().length <= 10) criticals.push(`C5: explanation ≤10 chars (idx ${idx})`);

  // W3: short question
  if (q.q && q.q.length < 15) warnings.push(`W3: short q (${q.q.length} chars, idx ${idx})`);

  // W4: short explanation
  if (q.e && q.e.length > 0 && q.e.length < 20) warnings.push(`W4: short explanation (${q.e.length} chars, idx ${idx})`);

  // W6: option has letter prefix (А), Б), etc.)
  if (Array.isArray(q.o)) {
    for (let i = 0; i < q.o.length; i++) {
      if (q.o[i] && OPTION_PREFIX_RE.test(q.o[i])) {
        warnings.push(`W6: option[${i}] has letter prefix "${q.o[i].slice(0, 3)}..." (idx ${idx})`);
      }
    }
  }

  // W7: correct answer length outlier
  if (Array.isArray(q.o) && q.o.length === 4 && Number.isInteger(q.c) && q.c >= 0 && q.c <= 3) {
    const correctLen = q.o[q.c].length;
    const otherLens = q.o.filter((_, i) => i !== q.c).map(o => o.length);
    const avgOtherLen = otherLens.reduce((a, b) => a + b, 0) / otherLens.length;
    if (avgOtherLen > 0) {
      const ratio = correctLen / avgOtherLen;
      const absDiff = Math.abs(correctLen - avgOtherLen);
      if ((ratio > 2.0 || ratio < 0.5) && absDiff > 15) {
        warnings.push(`W7: correct answer length outlier (correct=${correctLen}, avg other=${avgOtherLen.toFixed(0)}, ratio=${ratio.toFixed(2)}, idx ${idx})`);
      }
    }
  }

  // W8: parenthetical hints — Cyrillic text in brackets that may serve as hints
  if (Array.isArray(q.o)) {
    const CYRILLIC_PARENS_RE = /\([а-яА-ЯёЁ][а-яА-ЯёЁ\s,ё]{3,}\)/;
    for (let i = 0; i < q.o.length; i++) {
      if (q.o[i] && CYRILLIC_PARENS_RE.test(q.o[i])) {
        const match = q.o[i].match(CYRILLIC_PARENS_RE);
        warnings.push(`W8: option[${i}] has Cyrillic hint in parens "${match[0]}" (idx ${idx})`);
      }
    }
  }

  return { criticals, warnings };
}

function validateSubject(subjectId, info) {
  const criticals = [];
  const warnings = [];
  let questions;

  if (info.isReading) {
    // R1: exactly 30 passages
    if (info.array.length !== 30) criticals.push(`R1: passage count ≠ 30 (got ${info.array.length})`);

    for (let pi = 0; pi < info.array.length; pi++) {
      const p = info.array[pi];
      // R2: 5 questions per passage
      if (!p.qs || p.qs.length !== 5) criticals.push(`R2: passage ${pi} has ${p.qs?.length} questions (expected 5)`);
      // R3: title non-empty
      if (!p.t || p.t.trim().length === 0) criticals.push(`R3: passage ${pi} title empty`);
      // R4: text > 50 chars
      if (!p.tx || p.tx.length <= 50) criticals.push(`R4: passage ${pi} text ≤50 chars`);
    }

    questions = flattenReading(info.array);
  } else {
    questions = info.array;
  }

  // C7: exactly 150 questions
  if (questions.length !== 150) criticals.push(`C7: count ≠ 150 (got ${questions.length})`);

  // Validate each question
  for (let i = 0; i < questions.length; i++) {
    const r = validateQuestion(questions[i], i, subjectId);
    criticals.push(...r.criticals);
    warnings.push(...r.warnings);
  }

  // W5: duplicate questions within subject
  const seen = new Map();
  for (let i = 0; i < questions.length; i++) {
    const key = questions[i].q.trim().toLowerCase();
    if (seen.has(key)) {
      warnings.push(`W5: duplicate q at idx ${seen.get(key)} and ${i}`);
    } else {
      seen.set(key, i);
    }
  }

  // c-distribution warnings
  const dist = cDistribution(questions);
  const total = questions.length;
  for (let v = 0; v < 4; v++) {
    const pct = (dist[v] / total) * 100;
    if (pct > 40) warnings.push(`W1: c:${v} = ${pct.toFixed(0)}% (${dist[v]}/${total}, expected ~25%)`);
  }

  const { maxRun, maxVal } = maxConsecutive(questions);
  if (maxRun > 5) warnings.push(`W2: ${maxRun} consecutive c:${maxVal} (max allowed: 5)`);

  return { criticals, warnings, questions, dist };
}

// ── Fix mode: shuffle options to fix c-distribution ────────────────────────

function shuffleQuestionOptions(q) {
  const correctText = q.o[q.c];
  const shuffled = shuffle(q.o);
  const newC = shuffled.indexOf(correctText);
  return { ...q, o: shuffled, c: newC };
}

function fixDistribution(questions) {
  const MAX_ATTEMPTS = 20;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const fixed = questions.map(q => shuffleQuestionOptions(q));
    const dist = cDistribution(fixed);
    const total = fixed.length;
    const maxPct = Math.max(...dist) / total * 100;
    const { maxRun } = maxConsecutive(fixed);
    if (maxPct <= 35 && maxRun <= 5) return fixed;
  }
  // Fallback: just shuffle, better than nothing
  return questions.map(q => shuffleQuestionOptions(q));
}

function needsFix(questions) {
  const dist = cDistribution(questions);
  const total = questions.length;
  const maxPct = Math.max(...dist) / total * 100;
  const { maxRun } = maxConsecutive(questions);
  return maxPct > 40 || maxRun > 5;
}

function escapeForJS(str) {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n');
}

function questionToJS(q) {
  const opts = q.o.map(o => `"${escapeForJS(o)}"`).join(',');
  return `{q:"${escapeForJS(q.q)}",o:[${opts}],c:${q.c},e:"${escapeForJS(q.e || '')}"}`;
}

function rewriteRegularFile(subjectId, info, fixedQuestions) {
  const filePath = join(srcDir, info.file);
  const original = readFileSync(filePath, 'utf-8');

  // Extract the comment header if present
  const headerMatch = original.match(/^(\/\/[^\n]*\n)*/);
  const header = headerMatch ? headerMatch[0] : '';

  const lines = [header ? header.trimEnd() : `// ${info.file}`, `const ${info.exportName} = [`];
  for (const q of fixedQuestions) {
    lines.push(questionToJS(q) + ',');
  }
  lines.push('];', '', `export { ${info.exportName} };`, '');

  writeFileSync(filePath, lines.join('\n'), 'utf-8');
}

function rewriteReadingFile(subjectId, info, fixedPassages) {
  const filePath = join(srcDir, info.file);
  const original = readFileSync(filePath, 'utf-8');

  const headerMatch = original.match(/^(\/\/[^\n]*\n)*/);
  const header = headerMatch ? headerMatch[0] : '';

  const lines = [header ? header.trimEnd() : `// ${info.file}`, `const ${info.exportName} = [`];
  for (const p of fixedPassages) {
    lines.push(`{t:"${escapeForJS(p.t)}",tx:"${escapeForJS(p.tx)}",qs:[`);
    for (const q of p.qs) {
      lines.push(questionToJS(q) + ',');
    }
    lines.push(']},');
  }
  lines.push('];', '', `export { ${info.exportName} };`, '');

  writeFileSync(filePath, lines.join('\n'), 'utf-8');
}

// ── Main ───────────────────────────────────────────────────────────────────

console.log('╔══════════════════════════════════════════════════════════════╗');
console.log('║                  ENTprep Question Validator                  ║');
console.log('╠══════════════════════════════════════════════════════════════╣');
if (FIX_MODE) console.log('║  Mode: --fix (will rewrite files to fix c-distribution)      ║');
console.log('');

let totalCritical = 0;
let totalWarnings = 0;
let totalQuestions = 0;
let fixedCount = 0;

for (const [subjectId, info] of Object.entries(SUBJECTS)) {
  const result = validateSubject(subjectId, info);
  totalCritical += result.criticals.length;
  totalWarnings += result.warnings.length;
  totalQuestions += result.questions.length;

  const icon = result.criticals.length > 0 ? '❌' : result.warnings.length > 0 ? '⚠️ ' : '✅';
  const distStr = `c:[${result.dist.join(',')}]`;
  const passageStr = info.isReading ? `  ${info.array.length} passages` : '';
  const pad = subjectId.padEnd(14);

  console.log(`${icon} ${pad} ${result.questions.length}q  ${distStr}  ${result.criticals.length} critical  ${result.warnings.length} warnings${passageStr}`);

  for (const c of result.criticals) console.log(`   🔴 ${c}`);
  for (const w of result.warnings) console.log(`   ⚠  ${w}`);

  // Fix mode
  if (FIX_MODE && result.criticals.length === 0) {
    let didFix = false;

    if (info.isReading) {
      // Strip prefixes from reading passages
      const strippedPassages = info.array.map(p => ({
        ...p,
        qs: p.qs.map(q => stripPrefixesFromQuestion(q)),
      }));
      const allQs = flattenReading(strippedPassages);
      const hadPrefixes = hasOptionPrefixes(flattenReading(info.array));

      if (needsFix(allQs) || hadPrefixes) {
        // Shuffle within each passage (preserve passage grouping)
        const fixedPassages = strippedPassages.map(p => ({
          ...p,
          qs: p.qs.map(q => shuffleQuestionOptions(q)),
        }));
        let flatFixed = flattenReading(fixedPassages);
        let attempts = 0;
        while (needsFix(flatFixed) && attempts < 20) {
          for (let pi = 0; pi < fixedPassages.length; pi++) {
            fixedPassages[pi] = { ...fixedPassages[pi], qs: fixedPassages[pi].qs.map(q => shuffleQuestionOptions(q)) };
          }
          flatFixed = flattenReading(fixedPassages);
          attempts++;
        }
        rewriteReadingFile(subjectId, info, fixedPassages);
        const newDist = cDistribution(flatFixed);
        const fixes = [];
        if (hadPrefixes) fixes.push('stripped prefixes');
        if (needsFix(flattenReading(info.array))) fixes.push('fixed c-dist');
        console.log(`   ✏️  FIXED (${fixes.join(', ')}) → c:[${newDist.join(',')}]`);
        didFix = true;
      }
    } else {
      const stripped = info.array.map(q => stripPrefixesFromQuestion(q));
      const hadPrefixes = hasOptionPrefixes(info.array);

      if (needsFix(stripped) || hadPrefixes) {
        const fixed = needsFix(stripped) ? fixDistribution(stripped) : stripped.map(q => shuffleQuestionOptions(q));
        rewriteRegularFile(subjectId, info, fixed);
        const newDist = cDistribution(fixed);
        const fixes = [];
        if (hadPrefixes) fixes.push('stripped prefixes');
        if (needsFix(info.array)) fixes.push('fixed c-dist');
        console.log(`   ✏️  FIXED (${fixes.join(', ')}) → c:[${newDist.join(',')}]`);
        didFix = true;
      }
    }

    if (didFix) fixedCount++;
  }
}

console.log('');
console.log(`Summary: ${totalQuestions} questions, ${totalCritical} critical, ${totalWarnings} warnings`);
if (FIX_MODE) console.log(`Fixed: ${fixedCount} subjects rewritten`);

if (totalCritical > 0) {
  console.log('\n❌ VALIDATION FAILED — fix critical errors before seeding');
  process.exit(1);
} else if (totalWarnings > 0) {
  console.log('\n⚠️  Warnings found — consider running with --fix');
  process.exit(0);
} else {
  console.log('\n✅ All checks passed');
  process.exit(0);
}
