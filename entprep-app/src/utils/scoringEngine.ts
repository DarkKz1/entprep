import type { Question } from '../types/index';
import { getQType } from '../types/index';

export interface ScoreResult {
  pts: number;
  maxPts: number;
  correct: boolean;
  partial?: boolean; // true when multiple-choice earns 1/2
}

/**
 * Score a question based on its type and the user's answer.
 *
 * - single:   answer (number) === c → 1pt
 * - multiple:  symmetric difference between answer (number[]) and c (number[]):
 *              0 errors → 2pt, 1 error → 1pt (partial), 2+ errors → 0pt
 * - matching:  answer (Record<number,number>) all pairs match → 2pt, else 0pt
 */
export function scoreQuestion(
  q: Question,
  answer: unknown,
  ptsPerQ?: number,
): ScoreResult {
  const qType = getQType(q);

  if (qType === 'multiple') {
    const maxPts = ptsPerQ ?? 2;
    const correctArr = Array.isArray(q.c) ? q.c : [q.c];
    const userArr = Array.isArray(answer) ? (answer as number[]) : [];

    // Symmetric difference: items in one but not the other
    const missed = correctArr.filter(c => !userArr.includes(c));
    const extra = userArr.filter(a => !correctArr.includes(a));
    const errors = missed.length + extra.length;

    if (errors === 0) return { pts: maxPts, maxPts, correct: true };
    if (errors === 1) return { pts: maxPts / 2, maxPts, correct: false, partial: true };
    return { pts: 0, maxPts, correct: false };
  }

  if (qType === 'matching') {
    const maxPts = ptsPerQ ?? 2;
    if (!q.pairs || typeof answer !== 'object' || answer === null) {
      return { pts: 0, maxPts, correct: false };
    }
    const userMap = answer as Record<number, number>;
    // Check all 5 pairs: user maps left index → right index
    // Correct when userMap[i] === i (because pairs[i] is the correct pair)
    const allCorrect = q.pairs.every((_, i) => userMap[i] === i);
    return { pts: allCorrect ? maxPts : 0, maxPts, correct: allCorrect };
  }

  // single (default)
  const maxPts = ptsPerQ ?? 1;
  const c = typeof q.c === 'number' ? q.c : q.c[0];
  const correct = answer === c;
  return { pts: correct ? maxPts : 0, maxPts, correct };
}

/**
 * Score an array of questions with corresponding answers.
 * Returns total points, max points, and per-question results.
 */
export function scoreSection(
  questions: Question[],
  answers: Record<number, unknown>,
  ptsPerQOverride?: number,
): { totalPts: number; maxPts: number; results: ScoreResult[] } {
  const results = questions.map((q, i) => {
    const answer = answers[i];
    if (answer === undefined) {
      const qType = getQType(q);
      const maxPts = ptsPerQOverride ?? (qType === 'single' ? 1 : 2);
      return { pts: 0, maxPts, correct: false };
    }
    return scoreQuestion(q, answer, ptsPerQOverride);
  });
  return {
    totalPts: results.reduce((s, r) => s + r.pts, 0),
    maxPts: results.reduce((s, r) => s + r.maxPts, 0),
    results,
  };
}
