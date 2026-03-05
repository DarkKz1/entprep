import { describe, it, expect, vi } from 'vitest';
import { calcTestXP, calcTotalXP, getTodayXP, getLevel, LEVELS } from '../xpHelpers';
import type { TestResult } from '../../types/index';

// ── Helpers ─────────────────────────────────────────────────────────────────

const regular = (sc: number, dt = '25.02.2026'): TestResult => ({
  su: 'math', co: 0, to: 10, sc, dt,
});

const fullent = (pts: number, dt = '25.02.2026'): TestResult => ({
  su: 'math', co: 0, to: 120, sc: 0, dt, type: 'fullent',
  sections: [
    { pts, maxPts: 140, correct: 0, total: 0 },
  ] as unknown as TestResult['sections'],
});

// ── calcTestXP ──────────────────────────────────────────────────────────────

describe('calcTestXP — regular tests', () => {
  it('0% → 0 XP', () => {
    expect(calcTestXP(regular(0))).toBe(0);
  });

  it('50% → 15 XP', () => {
    // 50 * 0.3 = 15
    expect(calcTestXP(regular(50))).toBe(15);
  });

  it('80% → 24 XP', () => {
    expect(calcTestXP(regular(80))).toBe(24);
  });

  it('100% → 35 XP (30 + 5 bonus)', () => {
    // 100 * 0.3 = 30, + 5 bonus for perfect
    expect(calcTestXP(regular(100))).toBe(35);
  });

  it('99% → no bonus', () => {
    expect(calcTestXP(regular(99))).toBe(30); // round(99 * 0.3) = 30, no bonus
  });
});

describe('calcTestXP — fullent', () => {
  it('0 pts → 0 XP', () => {
    expect(calcTestXP(fullent(0))).toBe(0);
  });

  it('70 pts → 35 XP', () => {
    // 70/140*100 = 50%, round(50 * 0.7) = 35
    expect(calcTestXP(fullent(70))).toBe(35);
  });

  it('140 pts (perfect) → 75 XP (70 + 5)', () => {
    // 140/140*100 = 100%, round(100 * 0.7) = 70, + 5 bonus
    expect(calcTestXP(fullent(140))).toBe(75);
  });

  it('100 pts → 50 XP', () => {
    // 100/140*100 ≈ 71.43%, round(71.43 * 0.7) = round(50) = 50
    expect(calcTestXP(fullent(100))).toBe(50);
  });

  it('handles sections as Record (legacy format)', () => {
    const result: TestResult = {
      su: 'math', sc: 0, dt: '25.02.2026', type: 'fullent',
      sections: {
        math: { pts: 10, correct: 8, total: 10, score: 80 },
        history: { pts: 30, correct: 15, total: 20, score: 75 },
      } as unknown as TestResult['sections'],
    };
    // pts = 10 + 30 = 40, pct = 40/140*100 ≈ 28.57, xp = round(28.57 * 0.7) = 20
    expect(calcTestXP(result)).toBe(20);
  });
});

// ── calcTotalXP ─────────────────────────────────────────────────────────────

describe('calcTotalXP', () => {
  it('empty history → 0', () => {
    expect(calcTotalXP([])).toBe(0);
  });

  it('sums multiple tests', () => {
    const hist = [regular(50), regular(80)]; // 15 + 24 = 39
    expect(calcTotalXP(hist)).toBe(39);
  });

  it('mixes regular and fullent', () => {
    const hist = [regular(100), fullent(140)]; // 35 + 75 = 110
    expect(calcTotalXP(hist)).toBe(110);
  });
});

// ── getTodayXP ──────────────────────────────────────────────────────────────

describe('getTodayXP', () => {
  it('returns 0 for empty history', () => {
    expect(getTodayXP([])).toBe(0);
  });

  it('only counts tests from today', () => {
    const today = new Date().toLocaleDateString('ru-RU');
    const hist = [regular(80, today), regular(60, '01.01.2020')];
    expect(getTodayXP(hist)).toBe(24); // only today's 80% test
  });

  it('sums all of today\'s tests', () => {
    const today = new Date().toLocaleDateString('ru-RU');
    const hist = [regular(50, today), regular(50, today)];
    expect(getTodayXP(hist)).toBe(30); // 15 + 15
  });
});

// ── getLevel ─────────────────────────────────────────────────────────────────

describe('getLevel', () => {
  it('0 XP → level 1 (Новичок)', () => {
    const l = getLevel(0);
    expect(l.level).toBe(1);
    expect(l.name).toBe('Новичок');
    expect(l.progress).toBe(0);
  });

  it('99 XP → still level 1, with progress', () => {
    const l = getLevel(99);
    expect(l.level).toBe(1);
    expect(l.progress).toBeCloseTo(0.99); // 99/100
  });

  it('100 XP → level 2 (Ученик)', () => {
    const l = getLevel(100);
    expect(l.level).toBe(2);
    expect(l.name).toBe('Ученик');
    expect(l.progress).toBe(0);
  });

  it('350 XP → level 3 (Знаток)', () => {
    const l = getLevel(350);
    expect(l.level).toBe(3);
    expect(l.name).toBe('Знаток');
  });

  it('800 XP → level 4 (Мастер)', () => {
    const l = getLevel(800);
    expect(l.level).toBe(4);
  });

  it('1800 XP → level 5 (Эксперт)', () => {
    const l = getLevel(1800);
    expect(l.level).toBe(5);
  });

  it('4000 XP → level 6 (Гений ЕНТ), max', () => {
    const l = getLevel(4000);
    expect(l.level).toBe(6);
    expect(l.name).toBe('Гений ЕНТ');
    expect(l.progress).toBe(1); // max level
  });

  it('10000 XP → still level 6', () => {
    const l = getLevel(10000);
    expect(l.level).toBe(6);
    expect(l.progress).toBe(1);
  });

  it('progress midway through a level', () => {
    // Level 2 starts at 100, level 3 at 350 → range = 250
    const l = getLevel(225); // 125 into 250 range
    expect(l.level).toBe(2);
    expect(l.progress).toBe(0.5);
  });

  it('totalXP is included in result', () => {
    const l = getLevel(500);
    expect(l.totalXP).toBe(500);
  });

  it('nextXP points to next level threshold', () => {
    const l = getLevel(200); // level 2, next is 350
    expect(l.nextXP).toBe(350);
  });

  it('max level nextXP equals own minXP', () => {
    const l = getLevel(5000); // level 6
    expect(l.nextXP).toBe(4000);
  });
});

// ── LEVELS constant ──────────────────────────────────────────────────────────

describe('LEVELS', () => {
  it('has 6 levels', () => {
    expect(LEVELS).toHaveLength(6);
  });

  it('levels are in ascending XP order', () => {
    for (let i = 1; i < LEVELS.length; i++) {
      expect(LEVELS[i].minXP).toBeGreaterThan(LEVELS[i - 1].minXP);
    }
  });

  it('level 1 starts at 0 XP', () => {
    expect(LEVELS[0].minXP).toBe(0);
  });
});
