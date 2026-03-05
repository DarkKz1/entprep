import { describe, it, expect } from 'vitest';
import { scoreQuestion, scoreSection } from '../scoringEngine';
import type { Question } from '../../types/index';

// ── Helpers ─────────────────────────────────────────────────────────────────

const single = (c: number): Question => ({
  q: 'Test?', o: ['A', 'B', 'C', 'D'], c, e: 'exp',
});

const multiple = (c: number[]): Question => ({
  q: 'Test?', o: ['A', 'B', 'C', 'D', 'E', 'F'], c, e: 'exp', type: 'multiple',
});

const matching = (): Question => ({
  q: 'Test?', o: [], c: 0, e: 'exp', type: 'matching',
  pairs: [['a', '1'], ['b', '2'], ['c', '3'], ['d', '4'], ['e', '5']],
});

// ── scoreQuestion: single ────────────────────────────────────────────────────

describe('scoreQuestion — single choice', () => {
  it('correct answer → 1pt', () => {
    const r = scoreQuestion(single(2), 2);
    expect(r).toEqual({ pts: 1, maxPts: 1, correct: true });
  });

  it('wrong answer → 0pt', () => {
    const r = scoreQuestion(single(0), 3);
    expect(r).toEqual({ pts: 0, maxPts: 1, correct: false });
  });

  it('custom ptsPerQ', () => {
    const r = scoreQuestion(single(1), 1, 3);
    expect(r).toEqual({ pts: 3, maxPts: 3, correct: true });
  });

  it('c as array for single (backward compat)', () => {
    const q: Question = { q: 'Q', o: ['A', 'B', 'C', 'D'], c: [2], e: '' };
    const r = scoreQuestion(q, 2);
    expect(r.correct).toBe(true);
    expect(r.pts).toBe(1);
  });

  it('null answer → wrong', () => {
    const r = scoreQuestion(single(0), null);
    expect(r.correct).toBe(false);
    expect(r.pts).toBe(0);
  });
});

// ── scoreQuestion: multiple ──────────────────────────────────────────────────

describe('scoreQuestion — multiple choice', () => {
  it('all correct → 2pt', () => {
    const r = scoreQuestion(multiple([0, 2, 4]), [0, 2, 4]);
    expect(r).toEqual({ pts: 2, maxPts: 2, correct: true });
  });

  it('1 missing → 1pt partial', () => {
    const r = scoreQuestion(multiple([0, 2, 4]), [0, 2]);
    expect(r).toEqual({ pts: 1, maxPts: 2, correct: false, partial: true });
  });

  it('1 extra → 1pt partial', () => {
    const r = scoreQuestion(multiple([0, 2, 4]), [0, 2, 4, 5]);
    expect(r).toEqual({ pts: 1, maxPts: 2, correct: false, partial: true });
  });

  it('2 errors → 0pt', () => {
    const r = scoreQuestion(multiple([0, 2, 4]), [0]);
    expect(r.pts).toBe(0);
    expect(r.correct).toBe(false);
    expect(r.partial).toBeUndefined();
  });

  it('completely wrong → 0pt', () => {
    const r = scoreQuestion(multiple([0, 2, 4]), [1, 3, 5]);
    expect(r.pts).toBe(0);
  });

  it('empty answer → 0pt', () => {
    const r = scoreQuestion(multiple([0, 2, 4]), []);
    expect(r.pts).toBe(0);
  });

  it('non-array answer → 0pt (graceful)', () => {
    const r = scoreQuestion(multiple([0, 2, 4]), 2);
    expect(r.pts).toBe(0);
  });

  it('custom ptsPerQ → partial is half', () => {
    const r = scoreQuestion(multiple([0, 2, 4]), [0, 2], 4);
    expect(r.pts).toBe(2); // 4 / 2
    expect(r.maxPts).toBe(4);
    expect(r.partial).toBe(true);
  });

  it('order of answers does not matter', () => {
    const r = scoreQuestion(multiple([0, 2, 4]), [4, 0, 2]);
    expect(r.correct).toBe(true);
    expect(r.pts).toBe(2);
  });
});

// ── scoreQuestion: matching ──────────────────────────────────────────────────

describe('scoreQuestion — matching', () => {
  it('all pairs correct → 2pt', () => {
    const r = scoreQuestion(matching(), { 0: 0, 1: 1, 2: 2, 3: 3, 4: 4 });
    expect(r).toEqual({ pts: 2, maxPts: 2, correct: true });
  });

  it('one pair wrong → 0pt', () => {
    const r = scoreQuestion(matching(), { 0: 0, 1: 1, 2: 2, 3: 4, 4: 3 });
    expect(r.pts).toBe(0);
    expect(r.correct).toBe(false);
  });

  it('missing pairs → 0pt', () => {
    const r = scoreQuestion(matching(), { 0: 0, 1: 1 });
    expect(r.pts).toBe(0);
  });

  it('null answer → 0pt', () => {
    const r = scoreQuestion(matching(), null);
    expect(r.pts).toBe(0);
  });

  it('no pairs on question → 0pt', () => {
    const q: Question = { q: 'Q', o: [], c: 0, e: '', type: 'matching' };
    const r = scoreQuestion(q, { 0: 0 });
    expect(r.pts).toBe(0);
  });

  it('custom ptsPerQ', () => {
    const r = scoreQuestion(matching(), { 0: 0, 1: 1, 2: 2, 3: 3, 4: 4 }, 5);
    expect(r.pts).toBe(5);
    expect(r.maxPts).toBe(5);
  });
});

// ── scoreSection ─────────────────────────────────────────────────────────────

describe('scoreSection', () => {
  it('scores mixed question types', () => {
    const questions = [single(0), multiple([1, 3]), matching()];
    const answers: Record<number, unknown> = {
      0: 0,                               // single correct → 1pt
      1: [1, 3],                           // multiple all correct → 2pt
      2: { 0: 0, 1: 1, 2: 2, 3: 3, 4: 4 }, // matching correct → 2pt
    };
    const { totalPts, maxPts, results } = scoreSection(questions, answers);
    expect(totalPts).toBe(5);
    expect(maxPts).toBe(5);
    expect(results).toHaveLength(3);
  });

  it('unanswered questions → 0pt with correct maxPts', () => {
    const questions = [single(0), multiple([1, 3])];
    const { totalPts, maxPts } = scoreSection(questions, {});
    expect(totalPts).toBe(0);
    expect(maxPts).toBe(3); // 1 + 2
  });

  it('ptsPerQOverride applies to all', () => {
    const questions = [single(0), single(1)];
    const { totalPts, maxPts } = scoreSection(questions, { 0: 0, 1: 1 }, 3);
    expect(totalPts).toBe(6);
    expect(maxPts).toBe(6);
  });

  it('empty questions array', () => {
    const { totalPts, maxPts, results } = scoreSection([], {});
    expect(totalPts).toBe(0);
    expect(maxPts).toBe(0);
    expect(results).toEqual([]);
  });
});
