/**
 * Shared question quality checks.
 * Used by: audit-quality.mjs, replace-weak.mjs, ingest-questions.mjs
 *
 * Design principles:
 * - "Сколько" is fine for math/informatics (counting problems) — only flag for simple recall
 * - Reading passage questions are naturally short — exempt from length checks
 * - Self-answer detection accounts for subject-specific terminology (chemical formulas, etc.)
 */

// ── Normalize text for comparison ────────────────────────────────────────────
export function normalize(s) {
  return (s || '').toLowerCase().replace(/[.,!?;:()«»"'\-—–₂₃⁺²³⁻⁰¹⁴⁵⁶⁷⁸⁹]/g, '').trim();
}

// ── Trivial pattern detection ────────────────────────────────────────────────
// Patterns that indicate simple recall / definition questions.
// "Сколько" excluded — it's legitimate for math, informatics, chemistry.
const TRIVIAL_PATTERNS = [
  /^Что такое /i,
  /^Кто такой /i,
  /^Кто является /i,
  /^Кто был /i,
  /^Назовите /i,
  /^Как называется /i,
  /^Столица /i,
  /^В каком году родился /i,
  /^Какой цвет /i,
];

// "Сколько" is trivial ONLY for these subjects (simple recall)
// For math/informatics/chemistry it's a legitimate analytical question
const SKOLKO_TRIVIAL_SUBJECTS = new Set([
  'history', 'geography', 'law', 'literature', 'world_history', 'biology',
]);

// ── Short question threshold ────────────────────────────────────────────────
const MIN_Q_LENGTH = 25;

// ── Empty/useless explanation patterns ──────────────────────────────────────
const EMPTY_EXPLANATION_PATTERNS = [
  /^Правильный ответ[:\s]/i,
  /^Верный ответ[:\s]/i,
  /^Ответ[:\s]/i,
  /^Правильный вариант/i,
];

// ── Check functions ─────────────────────────────────────────────────────────

/**
 * Check if a question is self-answering (correct answer text appears in question).
 * Returns issue string or null.
 *
 * False-positive mitigations:
 * - Verbatim: skip if match is in first 40% of question (problem setup/context)
 * - Word overlap: exclude words shared by 2+ other options (domain terminology)
 * - Word overlap: require 4+ unique significant words after domain term exclusion
 * - Word overlap: 85% threshold (75% had too many false positives)
 */
export function checkSelfAnswering(q, options, correctIdx) {
  const qNorm = normalize(q);
  const correctOption = normalize(options[correctIdx] || '');

  // Skip very short options — single numbers, letters, etc. are expected to appear in text
  if (correctOption.length <= 8) return null;

  // Check if correct answer appears verbatim in question
  if (qNorm.includes(correctOption)) {
    // Exception: if the match is in the first 40% of the question, it's likely problem
    // setup/context (e.g., "Researcher is at point X... what point will they reach?" → X)
    const matchPos = qNorm.indexOf(correctOption);
    if (matchPos >= 0 && matchPos + correctOption.length < qNorm.length * 0.4) {
      return null; // Answer appears in the setup context
    }
    return `answer "${(options[correctIdx] || '').slice(0, 40)}" found verbatim in question`;
  }

  // Build set of "domain words" — words that appear in 2+ OTHER options
  // These are shared terminology (e.g., "массовое число" in physics) not answer giveaways
  const otherOptions = options.filter((_, i) => i !== correctIdx).map(o => normalize(o));
  const domainWords = new Set();
  const correctWords = correctOption.split(/\s+/).filter(w => w.length >= 5);
  for (const w of correctWords) {
    const appearsInOthers = otherOptions.filter(oo => oo.includes(w)).length;
    if (appearsInOthers >= 2) domainWords.add(w);
  }

  // Filter out domain words — only check words unique to the correct answer
  const uniqueWords = correctWords.filter(w => !domainWords.has(w));
  // Skip if too few unique significant words
  if (uniqueWords.length < 4) return null;

  const matchingWords = uniqueWords.filter(w => qNorm.includes(w));
  const matchRatio = uniqueWords.length > 0 ? matchingWords.length / uniqueWords.length : 0;

  // 85% threshold — lower values had too many false positives with shared domain terminology
  if (matchRatio >= 0.85) {
    return `${Math.round(matchRatio * 100)}% of answer words found in question`;
  }

  return null;
}

/**
 * Check if question matches a trivial recall pattern.
 * Subject-aware: "Сколько" is only trivial for non-STEM subjects.
 */
export function checkTrivialPattern(q, subject = null) {
  for (const pattern of TRIVIAL_PATTERNS) {
    if (pattern.test(q)) {
      return `matches trivial pattern: ${pattern.source}`;
    }
  }

  // "Сколько" — only trivial for history/geography/law/etc
  if (/^Сколько /i.test(q)) {
    if (!subject || SKOLKO_TRIVIAL_SUBJECTS.has(subject)) {
      return 'matches trivial pattern: ^Сколько (simple recall)';
    }
    // For math/informatics/chemistry/physics — it's fine
  }

  return null;
}

/**
 * Check if question is too short.
 * isPassage: reading comprehension questions are allowed to be shorter.
 */
export function checkShortQuestion(q, isPassage = false) {
  if (isPassage) return null; // passage questions are naturally short
  if (q.length < MIN_Q_LENGTH) {
    return `too short (${q.length} chars < ${MIN_Q_LENGTH})`;
  }
  return null;
}

/**
 * Check if explanation is empty/useless.
 */
export function checkWeakExplanation(explanation) {
  if (!explanation || explanation.trim().length === 0) {
    return 'explanation missing';
  }
  if (explanation.trim().length < 15) {
    return `explanation too short (${explanation.trim().length} chars)`;
  }
  for (const pattern of EMPTY_EXPLANATION_PATTERNS) {
    // Only flag if the explanation is JUST the pattern (nothing useful after)
    const trimmed = explanation.trim();
    if (pattern.test(trimmed) && trimmed.length < 60) {
      return `useless explanation: "${trimmed.slice(0, 50)}"`;
    }
  }
  return null;
}

// ── Explanation vs correct answer mismatch ───────────────────────────────────

/**
 * Extract core value from an option text for comparison.
 * Strips units, whitespace, punctuation. "4761 м²" → "4761", "Алматы" → "алматы"
 */
function extractCore(text) {
  return (text || '').toLowerCase()
    .replace(/\s*(м²|м³|км²|км|см|мм|кг|г|л|мл|с|мин|ч|°c|°|%|тг|₸|руб|тенге)\s*/gi, '')
    .replace(/[.,!?;:()«»"'\-—–]/g, '')
    .trim();
}

/**
 * Check if the explanation contradicts the marked correct answer.
 * Detects when AI correctly solves a problem in the explanation but assigns
 * the wrong `c` index. Returns issue string or null.
 *
 * Logic:
 * 1. For each option, check if its core value appears in the explanation
 * 2. If a wrong option is mentioned in the explanation AND the correct option is NOT → mismatch
 * 3. Extra check: look for "= VALUE" pattern in explanation (math final answer)
 */
export function checkExplanationMismatch(q, options, correctIdx, explanation) {
  // Type guard: only works for single-choice (integer correctIdx, 4 options)
  if (!Number.isInteger(correctIdx) || !Array.isArray(options) || options.length !== 4) return null;
  if (!explanation || options.length === 0) return null;
  const expLower = (explanation || '').toLowerCase();
  const correctOption = options[correctIdx];
  if (!correctOption) return null;

  const correctCore = extractCore(correctOption);
  // Skip very short cores (single digit, etc.) — too many false positives
  if (correctCore.length < 2) return null;

  // Check which options' core values appear in the explanation
  const mentionedOptions = [];
  for (let i = 0; i < options.length; i++) {
    const core = extractCore(options[i]);
    if (core.length < 2) continue;
    if (expLower.includes(core)) {
      mentionedOptions.push(i);
    }
  }

  // If correct option is mentioned in explanation — no mismatch
  if (mentionedOptions.includes(correctIdx)) return null;

  // Check for "= VALUE" pattern (math answers: "= 4761", "равно 69")
  const eqMatches = explanation.match(/[=≈]\s*([\d\s.,]+)/g);
  if (eqMatches) {
    const lastEq = eqMatches[eqMatches.length - 1]; // Last "= X" is usually the final answer
    const eqValue = lastEq.replace(/[=≈\s.,]/g, '').trim();
    if (eqValue.length >= 2) {
      // Check if this final value matches a WRONG option but not the correct one
      const correctHasValue = correctCore.includes(eqValue) || eqValue.includes(correctCore);
      if (!correctHasValue) {
        for (let i = 0; i < options.length; i++) {
          if (i === correctIdx) continue;
          const core = extractCore(options[i]);
          if (core.includes(eqValue) || eqValue.includes(core)) {
            return `explanation concludes "${lastEq.trim()}" → matches option ${i} "${options[i]}", not marked correct "${correctOption}"`;
          }
        }
      }
    }
  }

  // If wrong options are mentioned but correct is not — likely mismatch
  const wrongMentioned = mentionedOptions.filter(i => i !== correctIdx);
  if (wrongMentioned.length > 0) {
    const wrongOpt = wrongMentioned[0];
    return `explanation mentions "${options[wrongOpt]}" but correct is marked as "${correctOption}"`;
  }

  return null;
}

// ── Composite check ─────────────────────────────────────────────────────────

/**
 * @typedef {Object} QualityIssue
 * @property {'self-answer'|'trivial'|'short'|'weak-explanation'} type
 * @property {string} detail
 * @property {'critical'|'warning'} severity
 */

/**
 * Run all quality checks on a single question row.
 * @param {Object} row - Supabase question row
 * @param {Object} [opts] - Options
 * @param {string} [opts.subject] - Subject ID (for subject-aware checks)
 * @param {boolean} [opts.isPassage] - Whether this is a reading passage question
 * @returns {QualityIssue[]}
 */
export function checkQuestion(row, opts = {}) {
  const issues = [];
  const q = row.q || '';
  const options = Array.isArray(row.o) ? row.o : [];
  const correctIdx = typeof row.c === 'number' ? row.c : (Array.isArray(row.c) ? row.c[0] : 0);
  const qType = row.type || 'single';
  const subject = opts.subject || null;
  const isPassage = opts.isPassage || false;

  // Self-answering — only for single-choice
  if (qType === 'single') {
    const sa = checkSelfAnswering(q, options, correctIdx);
    if (sa) issues.push({ type: 'self-answer', detail: sa, severity: 'critical' });
  }

  // Explanation contradicts correct answer (AI solved correctly but wrong c index)
  if (qType === 'single' && row.e) {
    const mismatch = checkExplanationMismatch(q, options, correctIdx, row.e);
    if (mismatch) issues.push({ type: 'answer-mismatch', detail: mismatch, severity: 'critical' });
  }

  // Trivial pattern
  const trivial = checkTrivialPattern(q, subject);
  if (trivial) issues.push({ type: 'trivial', detail: trivial, severity: 'warning' });

  // Short question
  const short = checkShortQuestion(q, isPassage);
  if (short) issues.push({ type: 'short', detail: short, severity: 'warning' });

  // Weak explanation
  const weakExp = checkWeakExplanation(row.e);
  if (weakExp) issues.push({ type: 'weak-explanation', detail: weakExp, severity: 'warning' });

  return issues;
}

/**
 * Quick boolean: is this question "weak" enough to warrant replacement?
 * Only returns true for serious issues (self-answering, truly trivial).
 */
export function isWeak(row, subject = null, isPassage = false) {
  const issues = checkQuestion(row, { subject, isPassage });
  return issues.some(i => i.severity === 'critical') ||
         issues.filter(i => i.type !== 'weak-explanation').some(i =>
           i.type === 'trivial' || (i.type === 'short' && !isPassage)
         );
}

// ── Deduplication helpers ───────────────────────────────────────────────────

export function tokenize(text) {
  return (text || '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, '')
    .split(/\s+/)
    .filter(w => w.length > 2);
}

export function jaccard(tokensA, tokensB) {
  const setA = new Set(tokensA);
  const setB = new Set(tokensB);
  if (setA.size === 0 && setB.size === 0) return 1;
  let intersection = 0;
  for (const item of setA) {
    if (setB.has(item)) intersection++;
  }
  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

/**
 * Check if a new question is too similar to any in the existing pool.
 * @param {string} newQ - New question text
 * @param {Array<{q: string}>} pool - Existing questions
 * @param {number} [threshold=0.70] - Jaccard threshold
 * @returns {{isDuplicate: boolean, matchIdx?: number, similarity?: number}}
 */
export function checkDuplicate(newQ, pool, threshold = 0.70) {
  const newTokens = tokenize(newQ);
  for (let i = 0; i < pool.length; i++) {
    const sim = jaccard(newTokens, tokenize(pool[i].q));
    if (sim >= threshold) {
      return { isDuplicate: true, matchIdx: i, similarity: sim };
    }
  }
  return { isDuplicate: false };
}

// ── Re-export shared constants from single source of truth ──────────────────
export { SUBJECT_NAMES, QUALITY_RULES, STEM_SUBJECTS, VALID_SUBJECTS, JACCARD_THRESHOLD, AI_MODEL, MODEL_ALIASES } from './constants.mjs';
