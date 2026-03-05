/**
 * Runtime quality checks for AI-generated questions (Netlify Functions).
 * Extracted from ai-generate.mjs to be reusable across admin-action.mjs etc.
 *
 * NOTE: This is a lightweight runtime version. The full quality module for
 * batch scripts lives at scripts/utils/quality.mjs (with dedup, Jaccard, etc.)
 */

// Re-export shared constants for convenience
export { SUBJECT_NAMES, QUALITY_RULES, STEM_SUBJECTS, VALID_SUBJECTS, JACCARD_THRESHOLD, AI_MODEL } from "./constants.mjs";

// ── Normalize text for comparison ────────────────────────────────────────────
export function normalize(s) {
  return (s || "").toLowerCase().replace(/[.,!?;:()«»"'\-—–₂₃⁺²³⁻⁰¹⁴⁵⁶⁷⁸⁹]/g, "").trim();
}

// ── Trivial pattern detection ────────────────────────────────────────────────
const TRIVIAL_PATTERNS = [
  /^Что такое /i, /^Кто такой /i, /^Кто является /i, /^Кто был /i,
  /^Назовите /i, /^Как называется /i, /^Столица /i,
  /^В каком году родился /i, /^Какой цвет /i,
];
const SKOLKO_TRIVIAL = new Set(["history", "geography", "law", "literature", "world_history", "biology"]);
const WEAK_EXP = [/^Правильный ответ[:\s]/i, /^Верный ответ[:\s]/i, /^Ответ[:\s]/i, /^Правильный вариант/i];

// ── Main quality check ──────────────────────────────────────────────────────

/**
 * Check a generated question for quality issues.
 * Returns an array of issue strings (empty = passed).
 */
export function checkGenerated(q, options, correctIdx, explanation, subject) {
  const issues = [];
  const qNorm = normalize(q);
  const cOpt = normalize(options[correctIdx] || "");

  // Self-answer: verbatim
  if (cOpt.length > 8 && qNorm.includes(cOpt)) {
    issues.push("Текст правильного ответа найден дословно в вопросе");
  }

  // Self-answer: word overlap (exclude shared domain words across options)
  if (!issues.length && cOpt.length > 8) {
    const otherOpts = options.filter((_, i) => i !== correctIdx).map(o => normalize(o));
    const cWords = cOpt.split(/\s+/).filter(w => w.length >= 5);
    const unique = cWords.filter(w => otherOpts.filter(oo => oo.includes(w)).length < 2);
    if (unique.length >= 4) {
      const matching = unique.filter(w => qNorm.includes(w));
      if (unique.length > 0 && matching.length / unique.length >= 0.85) {
        issues.push("Слова правильного ответа встречаются в вопросе (самоответный)");
      }
    }
  }

  // Trivial pattern
  for (const p of TRIVIAL_PATTERNS) {
    if (p.test(q)) { issues.push(`Тривиальный шаблон: ${p.source}`); break; }
  }
  if (/^Сколько /i.test(q) && (!subject || SKOLKO_TRIVIAL.has(subject))) {
    issues.push("Тривиальный шаблон: ^Сколько (простой подсчёт)");
  }

  // Short question
  if (q.length < 25) issues.push(`Вопрос слишком короткий (${q.length} < 25 символов)`);

  // Weak explanation
  if (!explanation || explanation.trim().length < 15) {
    issues.push("Объяснение слишком короткое");
  } else {
    for (const p of WEAK_EXP) {
      if (p.test(explanation.trim()) && explanation.trim().length < 60) {
        issues.push("Объяснение неинформативное (просто 'Правильный ответ: X')");
        break;
      }
    }
  }

  // Explanation contradicts marked correct answer
  const mismatch = checkExplanationMismatch(q, options, correctIdx, explanation);
  if (mismatch) {
    issues.push(`Несоответствие ответа: ${mismatch}`);
  }

  return issues;
}

// ── Explanation vs correct answer mismatch ───────────────────────────────────

/**
 * Extract core value from an option text for comparison.
 * Strips units, whitespace, punctuation. "4761 м²" → "4761", "Алматы" → "алматы"
 */
function extractCore(text) {
  return (text || "").toLowerCase()
    .replace(/\s*(м²|м³|км²|км|см|мм|кг|г|л|мл|с|мин|ч|°c|°|%|тг|₸|руб|тенге)\s*/gi, "")
    .replace(/[.,!?;:()«»"'\-—–]/g, "")
    .trim();
}

/**
 * Check if the explanation contradicts the marked correct answer.
 * Detects when AI correctly solves a problem in the explanation but assigns
 * the wrong `c` index.
 */
export function checkExplanationMismatch(q, options, correctIdx, explanation) {
  // Type guard: only works for single-choice (integer correctIdx, 4 options)
  if (!Number.isInteger(correctIdx) || !Array.isArray(options) || options.length !== 4) return null;
  if (!explanation || options.length === 0) return null;
  const expLower = (explanation || "").toLowerCase();
  const correctOption = options[correctIdx];
  if (!correctOption) return null;

  const correctCore = extractCore(correctOption);
  if (correctCore.length < 2) return null;

  // Check which options' core values appear in the explanation
  const mentionedOptions = [];
  for (let i = 0; i < options.length; i++) {
    const core = extractCore(options[i]);
    if (core.length < 2) continue;
    if (expLower.includes(core)) mentionedOptions.push(i);
  }

  // If correct option is mentioned — no mismatch
  if (mentionedOptions.includes(correctIdx)) return null;

  // Check for "= VALUE" pattern (math: "= 4761", "равно 69")
  const eqMatches = explanation.match(/[=≈]\s*([\d\s.,]+)/g);
  if (eqMatches) {
    const lastEq = eqMatches[eqMatches.length - 1];
    const eqValue = lastEq.replace(/[=≈\s.,]/g, "").trim();
    if (eqValue.length >= 2) {
      const correctHasValue = correctCore.includes(eqValue) || eqValue.includes(correctCore);
      if (!correctHasValue) {
        for (let i = 0; i < options.length; i++) {
          if (i === correctIdx) continue;
          const core = extractCore(options[i]);
          if (core.includes(eqValue) || eqValue.includes(core)) {
            return `объяснение заключает "${lastEq.trim()}" → вариант ${i} "${options[i]}", а не отмеченный "${correctOption}"`;
          }
        }
      }
    }
  }

  // If wrong options are mentioned but correct is not — likely mismatch
  const wrongMentioned = mentionedOptions.filter(i => i !== correctIdx);
  if (wrongMentioned.length > 0) {
    const wrongOpt = wrongMentioned[0];
    return `объяснение упоминает "${options[wrongOpt]}", а правильным отмечен "${correctOption}"`;
  }

  return null;
}

// ── Deduplication helpers (lightweight, for admin insert) ───────────────────

export function tokenize(text) {
  return (text || '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, '')
    .split(/\s+/)
    .filter(w => w.length > 2);
}

export function jaccard(tokensA, tokensB) {
  const setA = new Set(Array.isArray(tokensA) ? tokensA : [...tokensA]);
  const setB = new Set(Array.isArray(tokensB) ? tokensB : [...tokensB]);
  if (setA.size === 0 && setB.size === 0) return 1;
  let intersection = 0;
  for (const item of setA) {
    if (setB.has(item)) intersection++;
  }
  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}
