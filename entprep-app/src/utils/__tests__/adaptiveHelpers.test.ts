import { describe, it, expect, vi } from 'vitest';
import type { TestResult } from '../../types/index';

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

vi.mock('../../config/topics', () => ({
  TOPIC_MAP: {
    math: [
      { id: 'algebra', name: 'Алгебра', icon: '📐', ranges: [[0, 49]] },
      { id: 'geometry', name: 'Геометрия', icon: '📏', ranges: [[50, 99]] },
      { id: 'stats', name: 'Статистика', icon: '📊', ranges: [[100, 149]] },
    ],
  },
  getTopicQuestions: () => [],
}));

const { calcWeakness, getRecommendations, calcTopicStats, getWrongQuestions, getTopicForIndex, calcStreak } = await import('../adaptiveHelpers');

describe('calcWeakness', () => {
  it('returns default for no tests', () => {
    const w = calcWeakness('math', []);
    expect(w.score).toBe(50);
    expect(w.avg).toBe(0);
    expect(w.trend).toBe('none');
    expect(w.count).toBe(0);
  });

  it('calculates weakness from recent tests', () => {
    const hist: TestResult[] = [
      { su: 'math', sc: 80, dt: '01.01.2026' },
      { su: 'math', sc: 90, dt: '02.01.2026' },
    ];
    const w = calcWeakness('math', hist);
    expect(w.avg).toBe(85);
    expect(w.count).toBe(2);
  });

  it('only uses last 5 tests', () => {
    const hist: TestResult[] = Array.from({ length: 10 }, (_, i) => ({
      su: 'math',
      sc: i < 5 ? 30 : 90, // first 5 bad, last 5 good
      dt: `${String(i + 1).padStart(2, '0')}.01.2026`,
    }));
    const w = calcWeakness('math', hist);
    expect(w.avg).toBe(90); // only last 5
  });

  it('ignores fullent entries', () => {
    const hist: TestResult[] = [
      { su: 'math', sc: 70, dt: '01.01.2026' },
      { su: 'math', sc: 90, dt: '02.01.2026', type: 'fullent' as const },
    ];
    const w = calcWeakness('math', hist);
    expect(w.count).toBe(1);
    expect(w.avg).toBe(70);
  });

  it('detects improving trend', () => {
    const hist: TestResult[] = [
      { su: 'math', sc: 40, dt: '01.01.2026' },
      { su: 'math', sc: 45, dt: '02.01.2026' },
      { su: 'math', sc: 70, dt: '03.01.2026' },
      { su: 'math', sc: 80, dt: '04.01.2026' },
    ];
    const w = calcWeakness('math', hist);
    expect(w.trend).toBe('improving');
  });

  it('detects declining trend', () => {
    const hist: TestResult[] = [
      { su: 'math', sc: 80, dt: '01.01.2026' },
      { su: 'math', sc: 75, dt: '02.01.2026' },
      { su: 'math', sc: 50, dt: '03.01.2026' },
      { su: 'math', sc: 40, dt: '04.01.2026' },
    ];
    const w = calcWeakness('math', hist);
    expect(w.trend).toBe('declining');
  });
});

describe('getWrongQuestions', () => {
  it('returns empty for no history', () => {
    expect(getWrongQuestions([])).toEqual([]);
  });

  it('collects wrong answers', () => {
    const hist: TestResult[] = [
      {
        su: 'math',
        sc: 33,
        dt: '01.01.2026',
        qd: [
          { oi: 0, ok: true },
          { oi: 1, ok: false },
          { oi: 2, ok: false },
        ],
      },
    ];
    const wrongs = getWrongQuestions(hist);
    expect(wrongs).toHaveLength(2);
    expect(wrongs[0].oi).toBe(1);
    expect(wrongs[1].oi).toBe(2);
  });

  it('deduplicates by subject+index', () => {
    const hist: TestResult[] = [
      { su: 'math', sc: 0, dt: '01.01.2026', qd: [{ oi: 5, ok: false }] },
      { su: 'math', sc: 0, dt: '02.01.2026', qd: [{ oi: 5, ok: false }] },
    ];
    const wrongs = getWrongQuestions(hist);
    expect(wrongs).toHaveLength(1);
  });

  it('respects limit', () => {
    const hist: TestResult[] = [
      {
        su: 'math',
        sc: 0,
        dt: '01.01.2026',
        qd: Array.from({ length: 20 }, (_, i) => ({ oi: i, ok: false })),
      },
    ];
    const wrongs = getWrongQuestions(hist, 5);
    expect(wrongs).toHaveLength(5);
  });

  it('ignores fullent', () => {
    const hist: TestResult[] = [
      { su: 'math', sc: 0, dt: '01.01.2026', type: 'fullent' as const, qd: [{ oi: 0, ok: false }] },
    ];
    const wrongs = getWrongQuestions(hist);
    expect(wrongs).toHaveLength(0);
  });
});

describe('calcStreak', () => {
  it('returns 0 for empty history', () => {
    const s = calcStreak([]);
    expect(s.current).toBe(0);
    expect(s.best).toBe(0);
  });

  it('returns 1 for today only', () => {
    const today = new Date();
    const dt = `${String(today.getDate()).padStart(2, '0')}.${String(today.getMonth() + 1).padStart(2, '0')}.${today.getFullYear()}`;
    const s = calcStreak([{ su: 'math', sc: 80, dt } as TestResult]);
    expect(s.current).toBe(1);
  });

  it('counts consecutive days', () => {
    const dates: string[] = [];
    for (let i = 2; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      dates.push(`${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`);
    }
    const hist: TestResult[] = dates.map(dt => ({ su: 'math', sc: 80, dt }));
    const s = calcStreak(hist);
    expect(s.current).toBe(3);
  });

  it('breaks streak on gap', () => {
    const today = new Date();
    const threeDaysAgo = new Date(today);
    threeDaysAgo.setDate(today.getDate() - 3);
    const dt3 = `${String(threeDaysAgo.getDate()).padStart(2, '0')}.${String(threeDaysAgo.getMonth() + 1).padStart(2, '0')}.${threeDaysAgo.getFullYear()}`;
    const dtToday = `${String(today.getDate()).padStart(2, '0')}.${String(today.getMonth() + 1).padStart(2, '0')}.${today.getFullYear()}`;
    const s = calcStreak([{ su: 'math', sc: 80, dt: dt3 }, { su: 'math', sc: 80, dt: dtToday }] as TestResult[]);
    expect(s.current).toBe(1);
  });

  it('premium freeze saves streak on 1-day gap', () => {
    const fmtDate = (d: Date) =>
      `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
    // 3 consecutive days, then skip 1 day (yesterday)
    const dates: string[] = [];
    for (let i = 3; i >= 2; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      dates.push(fmtDate(d));
    }
    // Skip yesterday (i=1), today not tested
    const hist: TestResult[] = dates.map(dt => ({ su: 'math', sc: 80, dt }));
    const s = calcStreak(hist, true); // isPremium = true
    expect(s.frozenToday).toBe(true);
    expect(s.current).toBe(2); // the 2 active days
  });

  it('non-premium does not get freeze', () => {
    const fmtDate = (d: Date) =>
      `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
    const twoDaysAgo = new Date(); twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
    const hist: TestResult[] = [{ su: 'math', sc: 80, dt: fmtDate(twoDaysAgo) }];
    const s = calcStreak(hist, false);
    expect(s.current).toBe(0);
    expect(s.frozenToday).toBeUndefined();
  });

  it('tracks best streak separately from current', () => {
    const fmtDate = (d: Date) =>
      `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
    const today = new Date();
    // Old 5-day streak, then gap, then today
    const hist: TestResult[] = [];
    for (let i = 20; i >= 16; i--) {
      const d = new Date(); d.setDate(today.getDate() - i);
      hist.push({ su: 'math', sc: 80, dt: fmtDate(d) });
    }
    hist.push({ su: 'math', sc: 80, dt: fmtDate(today) });
    const s = calcStreak(hist);
    expect(s.current).toBe(1);
    expect(s.best).toBe(5);
  });
});

// ── getRecommendations ──────────────────────────────────────────────────────

describe('getRecommendations', () => {
  it('returns all subjects for no history', () => {
    const r = getRecommendations([], ['physics']);
    expect(r.totalTests).toBe(0);
    expect(r.overall).toBe(0);
    // math, reading, history (mandatory) + physics (profile)
    expect(r.weak.length + r.strong.length).toBe(4);
  });

  it('separates weak (score > 40) from strong', () => {
    const hist: TestResult[] = [
      { su: 'math', sc: 90, dt: '01.01.2026' },
      { su: 'math', sc: 95, dt: '02.01.2026' },
      { su: 'history', sc: 20, dt: '01.01.2026' },
    ];
    const r = getRecommendations(hist, ['physics']);
    // math has high scores → low weakness → strong
    // history has low score → high weakness → weak
    const strongIds = r.strong.map((s: { id: string }) => s.id);
    const weakIds = r.weak.map((s: { id: string }) => s.id);
    expect(strongIds).toContain('math');
    expect(weakIds).toContain('history');
  });

  it('calculates overall average (excluding fullent)', () => {
    const hist: TestResult[] = [
      { su: 'math', sc: 60, dt: '01.01.2026' },
      { su: 'math', sc: 80, dt: '02.01.2026' },
      { su: 'math', sc: 100, dt: '03.01.2026', type: 'fullent' as const },
    ];
    const r = getRecommendations(hist, []);
    expect(r.totalTests).toBe(2);
    expect(r.overall).toBe(70); // (60+80)/2
  });
});

// ── getTopicForIndex ────────────────────────────────────────────────────────

describe('getTopicForIndex', () => {
  it('returns topic ID for index in range', () => {
    expect(getTopicForIndex('math', 25)).toBe('algebra');  // 0-49
    expect(getTopicForIndex('math', 75)).toBe('geometry');  // 50-99
    expect(getTopicForIndex('math', 120)).toBe('stats');    // 100-149
  });

  it('returns null for out-of-range index', () => {
    expect(getTopicForIndex('math', 200)).toBeNull();
  });

  it('returns null for unknown subject', () => {
    expect(getTopicForIndex('unknown', 5)).toBeNull();
  });

  it('handles boundary values', () => {
    expect(getTopicForIndex('math', 0)).toBe('algebra');
    expect(getTopicForIndex('math', 49)).toBe('algebra');
    expect(getTopicForIndex('math', 50)).toBe('geometry');
  });
});

// ── calcTopicStats ──────────────────────────────────────────────────────────

describe('calcTopicStats', () => {
  it('returns null for reading subject', () => {
    expect(calcTopicStats('reading', [])).toBeNull();
  });

  it('returns null for no tests', () => {
    expect(calcTopicStats('math', [])).toBeNull();
  });

  it('returns null for subject without TOPIC_MAP', () => {
    expect(calcTopicStats('physics', [{ su: 'physics', sc: 80, dt: '01.01.2026', qd: [{ oi: 0, ok: true }] }])).toBeNull();
  });

  it('buckets questions by topic from _topic field', () => {
    const hist: TestResult[] = [{
      su: 'math', sc: 50, dt: '01.01.2026',
      qd: [
        { oi: 0, ok: true, tp: 'algebra' },
        { oi: 1, ok: false, tp: 'algebra' },
        { oi: 2, ok: true, tp: 'geometry' },
        { oi: 3, ok: true, tp: 'geometry' },
      ],
    }];
    const stats = calcTopicStats('math', hist);
    expect(stats).not.toBeNull();
    const algebra = stats!.find(s => s.id === 'algebra')!;
    const geometry = stats!.find(s => s.id === 'geometry')!;
    expect(algebra.total).toBe(2);
    expect(algebra.correct).toBe(1);
    expect(algebra.pct).toBe(50);
    expect(geometry.pct).toBe(100);
  });

  it('marks topics below 60% as weak', () => {
    const hist: TestResult[] = [{
      su: 'math', sc: 25, dt: '01.01.2026',
      qd: [
        { oi: 0, ok: false, tp: 'algebra' },
        { oi: 1, ok: false, tp: 'algebra' },
        { oi: 2, ok: false, tp: 'algebra' },
        { oi: 3, ok: true, tp: 'algebra' },
      ],
    }];
    const stats = calcTopicStats('math', hist)!;
    const algebra = stats.find(s => s.id === 'algebra')!;
    expect(algebra.pct).toBe(25);
    expect(algebra.weak).toBe(true);
  });

  it('returns -1 pct for topics with no questions', () => {
    const hist: TestResult[] = [{
      su: 'math', sc: 100, dt: '01.01.2026',
      qd: [{ oi: 0, ok: true, tp: 'algebra' }],
    }];
    const stats = calcTopicStats('math', hist)!;
    const statsWithNoData = stats.find(s => s.id === 'stats')!;
    expect(statsWithNoData.pct).toBe(-1);
    expect(statsWithNoData.weak).toBe(false);
  });

  it('falls back to getTopicForIndex when no tp field', () => {
    const hist: TestResult[] = [{
      su: 'math', sc: 100, dt: '01.01.2026',
      qd: [
        { oi: 10, ok: true },   // algebra (0-49)
        { oi: 60, ok: false },  // geometry (50-99)
      ],
    }];
    const stats = calcTopicStats('math', hist)!;
    expect(stats.find(s => s.id === 'algebra')!.total).toBe(1);
    expect(stats.find(s => s.id === 'geometry')!.total).toBe(1);
  });
});
