import { describe, it, expect } from 'vitest';
import { createCard, reviewCard, getDueCards, getDueCount, addWrongAnswers, mergeSrCards } from '../srEngine';
import type { SRCard, TestResult } from '../../types/index';

describe('srEngine', () => {
  describe('createCard', () => {
    it('returns correct defaults', () => {
      const card = createCard('math', 42);
      expect(card.sid).toBe('math');
      expect(card.oi).toBe(42);
      expect(card.interval).toBe(0);
      expect(card.ease).toBe(2.5);
      expect(card.reps).toBe(0);
      expect(card.lapses).toBe(0);
      expect(card.due).toBe(new Date().toISOString().slice(0, 10));
    });
  });

  describe('reviewCard', () => {
    it('correct → interval increases 1→3→7...', () => {
      let card = createCard('math', 0);
      card = reviewCard(card, true);
      expect(card.reps).toBe(1);
      expect(card.interval).toBe(1);

      card = reviewCard(card, true);
      expect(card.reps).toBe(2);
      expect(card.interval).toBe(3);

      card = reviewCard(card, true);
      expect(card.reps).toBe(3);
      // interval = round(3 * 2.7) = 8
      expect(card.interval).toBe(8);
    });

    it('wrong → interval resets to 1, lapses increments', () => {
      let card = createCard('math', 0);
      card = reviewCard(card, true);
      card = reviewCard(card, true);
      card = reviewCard(card, false);
      expect(card.reps).toBe(0);
      expect(card.interval).toBe(1);
      expect(card.lapses).toBe(1);
    });

    it('ease never drops below 1.3', () => {
      let card = createCard('math', 0);
      // Repeatedly answer wrong to drive ease down
      for (let i = 0; i < 20; i++) {
        card = reviewCard(card, false);
      }
      expect(card.ease).toBeGreaterThanOrEqual(1.3);
    });

    it('interval caps at 60', () => {
      let card: SRCard = { sid: 'math', oi: 0, interval: 50, ease: 2.5, due: '2026-01-01', reps: 5, lapses: 0 };
      card = reviewCard(card, true);
      expect(card.interval).toBeLessThanOrEqual(60);
    });

    it('ease increases on correct', () => {
      let card = createCard('math', 0);
      const initialEase = card.ease;
      card = reviewCard(card, true);
      expect(card.ease).toBe(initialEase + 0.1);
    });

    it('ease decreases on wrong', () => {
      let card = createCard('math', 0);
      const initialEase = card.ease;
      card = reviewCard(card, false);
      expect(card.ease).toBe(initialEase - 0.2);
    });
  });

  describe('getDueCards', () => {
    it('returns only cards with due ≤ today', () => {
      const cards: SRCard[] = [
        { sid: 'math', oi: 0, interval: 1, ease: 2.5, due: '2020-01-01', reps: 1, lapses: 0 },
        { sid: 'math', oi: 1, interval: 1, ease: 2.5, due: '2099-01-01', reps: 1, lapses: 0 },
        { sid: 'math', oi: 2, interval: 1, ease: 2.5, due: '2026-03-12', reps: 1, lapses: 0 },
      ];
      const due = getDueCards(cards, '2026-03-12');
      expect(due).toHaveLength(2);
      expect(due.map(c => c.oi)).toEqual([0, 2]);
    });
  });

  describe('getDueCount', () => {
    it('returns correct count', () => {
      const cards: SRCard[] = [
        { sid: 'math', oi: 0, interval: 1, ease: 2.5, due: '2020-01-01', reps: 1, lapses: 0 },
        { sid: 'math', oi: 1, interval: 1, ease: 2.5, due: '2099-01-01', reps: 1, lapses: 0 },
      ];
      expect(getDueCount(cards, '2026-03-12')).toBe(1);
    });
  });

  describe('addWrongAnswers', () => {
    const result: TestResult = {
      su: 'math',
      sc: 50,
      dt: '12.03.2026',
      qd: [
        { oi: 0, ok: true },
        { oi: 1, ok: false },
        { oi: 2, ok: false },
        { oi: 3, ok: true },
      ],
    };

    it('adds wrong answers as new cards', () => {
      const cards = addWrongAnswers([], result);
      expect(cards).toHaveLength(2);
      expect(cards.map(c => c.oi)).toEqual([1, 2]);
    });

    it('deduplicates by sid:oi', () => {
      const existing: SRCard[] = [createCard('math', 1)];
      const cards = addWrongAnswers(existing, result);
      expect(cards).toHaveLength(2); // existing card 1 + new card 2
      expect(cards[0].oi).toBe(1);
      expect(cards[1].oi).toBe(2);
    });

    it('does not overwrite existing card with fresh one', () => {
      const existing: SRCard[] = [{ sid: 'math', oi: 1, interval: 3, ease: 2.3, due: '2026-03-15', reps: 2, lapses: 1 }];
      const cards = addWrongAnswers(existing, result);
      // The existing card should still have its original interval/ease
      expect(cards[0].interval).toBe(3);
      expect(cards[0].ease).toBe(2.3);
    });

    it('returns same array if no wrong answers', () => {
      const result2: TestResult = { su: 'math', sc: 100, dt: '12.03.2026', qd: [{ oi: 0, ok: true }] };
      const existing: SRCard[] = [];
      const cards = addWrongAnswers(existing, result2);
      expect(cards).toBe(existing);
    });

    it('returns same array if no qd', () => {
      const result3: TestResult = { su: 'math', sc: 100, dt: '12.03.2026' };
      const cards = addWrongAnswers([], result3);
      expect(cards).toEqual([]);
    });
  });

  describe('mergeSrCards', () => {
    it('deduplicates by sid:oi, keeps later due', () => {
      const a: SRCard[] = [
        { sid: 'math', oi: 0, interval: 1, ease: 2.5, due: '2026-03-10', reps: 1, lapses: 0 },
        { sid: 'math', oi: 1, interval: 1, ease: 2.5, due: '2026-03-12', reps: 1, lapses: 0 },
      ];
      const b: SRCard[] = [
        { sid: 'math', oi: 0, interval: 3, ease: 2.6, due: '2026-03-15', reps: 2, lapses: 0 },
        { sid: 'physics', oi: 5, interval: 1, ease: 2.5, due: '2026-03-12', reps: 1, lapses: 0 },
      ];
      const merged = mergeSrCards(a, b);
      expect(merged).toHaveLength(3);
      // math:0 should be from b (later due)
      const math0 = merged.find(c => c.sid === 'math' && c.oi === 0)!;
      expect(math0.due).toBe('2026-03-15');
      expect(math0.interval).toBe(3);
    });
  });
});
