import { describe, it, expect, vi } from 'vitest';
import type { TestResult } from '../../types/index';

// Mock questionPools before importing
vi.mock('../../config/questionPools', () => ({
  ALL_PROFILES: [
    { id: 'physics', name: 'Физика', icon: '⚛️', color: '#8B5CF6' },
  ],
  SUBS: {
    math: { id: 'math', name: 'Мат. грамотность', icon: '🔢', color: '#0EA5E9' },
    reading: { id: 'reading', name: 'Грамотность чтения', icon: '📖', color: '#22c55e' },
    history: { id: 'history', name: 'История Казахстана', icon: '🏛️', color: '#f59e0b' },
  },
}));

const {
  getPersonalBests,
  isNewRecord,
  getStreakMilestone,
  getStreakMotivation,
  getGoalProgress,
  getScoreHistory,
} = await import('../competitionHelpers');

describe('getPersonalBests', () => {
  it('returns empty for no history', () => {
    expect(getPersonalBests([])).toEqual({});
  });

  it('tracks best score per subject', () => {
    const hist: TestResult[] = [
      { su: 'math', sc: 60, dt: '01.01.2026' },
      { su: 'math', sc: 80, dt: '02.01.2026' },
      { su: 'math', sc: 70, dt: '03.01.2026' },
      { su: 'physics', sc: 90, dt: '01.01.2026' },
    ];
    const bests = getPersonalBests(hist);
    expect(bests.math.best).toBe(80);
    expect(bests.math.count).toBe(3);
    expect(bests.physics.best).toBe(90);
  });

  it('ignores fullent entries', () => {
    const hist: TestResult[] = [
      { su: 'math', sc: 60, dt: '01.01.2026' },
      { su: 'fullent', sc: 120, dt: '02.01.2026', type: 'fullent' as const },
    ];
    const bests = getPersonalBests(hist);
    expect(bests.math.best).toBe(60);
    expect(bests.fullent).toBeUndefined();
  });
});

describe('isNewRecord', () => {
  it('first test is always a record', () => {
    const result = isNewRecord([], { su: 'math', sc: 50 });
    expect(result.isRecord).toBe(true);
    expect(result.prevBest).toBe(0);
  });

  it('detects new record', () => {
    const hist: TestResult[] = [{ su: 'math', sc: 60, dt: '01.01.2026' }];
    const result = isNewRecord(hist, { su: 'math', sc: 80 });
    expect(result.isRecord).toBe(true);
    expect(result.prevBest).toBe(60);
    expect(result.improvement).toBe(20);
  });

  it('no record when score is lower', () => {
    const hist: TestResult[] = [{ su: 'math', sc: 80, dt: '01.01.2026' }];
    const result = isNewRecord(hist, { su: 'math', sc: 60 });
    expect(result.isRecord).toBe(false);
  });
});

describe('getStreakMilestone', () => {
  it('no milestone at 0', () => {
    const m = getStreakMilestone(0);
    expect(m.isMilestone).toBe(false);
    expect(m.next).toBe(3);
  });

  it('milestone at 3', () => {
    const m = getStreakMilestone(3);
    expect(m.isMilestone).toBe(true);
    expect(m.milestone).toBe(3);
  });

  it('milestone at 7', () => {
    const m = getStreakMilestone(7);
    expect(m.isMilestone).toBe(true);
    expect(m.milestone).toBe(7);
  });

  it('between milestones', () => {
    const m = getStreakMilestone(5);
    expect(m.isMilestone).toBe(false);
    expect(m.milestone).toBe(3);
    expect(m.next).toBe(7);
  });
});

describe('getStreakMotivation', () => {
  it('0 days', () => {
    expect(getStreakMotivation(0)).toContain('Начни');
  });

  it('1 day', () => {
    expect(getStreakMotivation(1)).toContain('Начало');
  });

  it('2 days', () => {
    expect(getStreakMotivation(2)).toContain('3');
  });

  it('3 days — milestone message', () => {
    const msg = getStreakMotivation(3);
    expect(msg).toBe('3 дня подряд!');
  });
});

describe('getGoalProgress', () => {
  it('returns null without goal', () => {
    expect(getGoalProgress([], null)).toBeNull();
    expect(getGoalProgress([], {})).toBeNull();
    expect(getGoalProgress([], { target: 100 })).toBeNull();
  });

  it('calculates progress with history', () => {
    const hist: TestResult[] = [
      { su: 'math', sc: 70, dt: '01.01.2026' },
      { su: 'math', sc: 80, dt: '02.01.2026' },
    ];
    const goal = { target: 100, date: '2026-06-01' };
    const result = getGoalProgress(hist, goal);
    expect(result).not.toBeNull();
    expect(result!.currentAvg).toBe(75);
    expect(result!.approxScore).toBe(105); // 75 * 1.4
    expect(result!.target).toBe(100);
    expect(result!.daysLeft).toBeGreaterThan(0);
  });

  it('returns 0 with no tests', () => {
    const goal = { target: 100, date: '2026-06-01' };
    const result = getGoalProgress([], goal);
    expect(result!.currentAvg).toBe(0);
    expect(result!.approxScore).toBe(0);
  });
});

describe('getScoreHistory', () => {
  it('returns empty for no tests', () => {
    expect(getScoreHistory([], 'math')).toEqual([]);
  });

  it('filters by subject', () => {
    const hist: TestResult[] = [
      { su: 'math', sc: 60, dt: '01.01.2026' },
      { su: 'physics', sc: 90, dt: '01.01.2026' },
      { su: 'math', sc: 70, dt: '02.01.2026' },
    ];
    const result = getScoreHistory(hist, 'math');
    expect(result).toHaveLength(2);
    expect(result[0].score).toBe(60);
    expect(result[1].score).toBe(70);
  });

  it('excludes fullent', () => {
    const hist: TestResult[] = [
      { su: 'math', sc: 60, dt: '01.01.2026' },
      { su: 'math', sc: 70, dt: '02.01.2026', type: 'fullent' as const },
    ];
    const result = getScoreHistory(hist, 'math');
    expect(result).toHaveLength(1);
  });
});
