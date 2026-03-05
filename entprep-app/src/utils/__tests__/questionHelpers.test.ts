import { describe, it, expect } from 'vitest';
import { shuffleArray, shuffleOptions } from '../questionHelpers';
import type { Question } from '../../types/index';

// ── Helpers ─────────────────────────────────────────────────────────────────

const single = (c: number = 2): Question => ({
  q: 'Capital of Kazakhstan?',
  o: ['Almaty', 'Karaganda', 'Astana', 'Shymkent'],
  c,
  e: 'Astana is the capital',
});

const multiple = (): Question => ({
  q: 'Select all metals',
  o: ['Fe', 'O₂', 'Cu', 'N₂', 'Au', 'Cl₂'],
  c: [0, 2, 4], // Fe, Cu, Au
  e: 'Fe Cu Au are metals',
  type: 'multiple',
});

const matching = (): Question => ({
  q: 'Match countries to capitals',
  o: [],
  c: 0,
  e: '',
  type: 'matching',
  pairs: [['KZ', 'Astana'], ['RU', 'Moscow'], ['US', 'Washington'], ['FR', 'Paris'], ['JP', 'Tokyo']],
});

// ── shuffleArray ────────────────────────────────────────────────────────────

describe('shuffleArray', () => {
  it('returns same length', () => {
    const arr = [1, 2, 3, 4, 5];
    expect(shuffleArray(arr)).toHaveLength(5);
  });

  it('contains same elements', () => {
    const arr = [1, 2, 3, 4, 5];
    expect(shuffleArray(arr).sort()).toEqual([1, 2, 3, 4, 5]);
  });

  it('does not mutate original', () => {
    const arr = [1, 2, 3, 4, 5];
    const copy = [...arr];
    shuffleArray(arr);
    expect(arr).toEqual(copy);
  });

  it('returns new array reference', () => {
    const arr = [1, 2, 3];
    expect(shuffleArray(arr)).not.toBe(arr);
  });

  it('handles empty array', () => {
    expect(shuffleArray([])).toEqual([]);
  });

  it('handles single element', () => {
    expect(shuffleArray([42])).toEqual([42]);
  });

  it('eventually produces different orders (probabilistic)', () => {
    const arr = [1, 2, 3, 4, 5, 6, 7, 8];
    const results = new Set<string>();
    for (let i = 0; i < 50; i++) {
      results.add(JSON.stringify(shuffleArray(arr)));
    }
    // With 8 elements and 50 attempts, we should see > 1 unique order
    expect(results.size).toBeGreaterThan(1);
  });
});

// ── shuffleOptions: single choice ───────────────────────────────────────────

describe('shuffleOptions — single choice', () => {
  it('preserves all option texts', () => {
    const q = single(2);
    const shuffled = shuffleOptions(q);
    expect(shuffled.o.sort()).toEqual([...q.o].sort());
  });

  it('correct answer points to same text after shuffle', () => {
    const q = single(2); // correct is 'Astana'
    const shuffled = shuffleOptions(q);
    const correctIdx = shuffled.c as number;
    expect(shuffled.o[correctIdx]).toBe('Astana');
  });

  it('does not mutate original question', () => {
    const q = single(2);
    const origOptions = [...q.o];
    const origC = q.c;
    shuffleOptions(q);
    expect(q.o).toEqual(origOptions);
    expect(q.c).toBe(origC);
  });

  it('c is always a number for single', () => {
    for (let i = 0; i < 20; i++) {
      const shuffled = shuffleOptions(single(0));
      expect(typeof shuffled.c).toBe('number');
    }
  });
});

// ── shuffleOptions: multiple choice ─────────────────────────────────────────

describe('shuffleOptions — multiple choice', () => {
  it('preserves all option texts', () => {
    const q = multiple();
    const shuffled = shuffleOptions(q);
    expect(shuffled.o.sort()).toEqual([...q.o].sort());
  });

  it('correct indices still point to correct answers', () => {
    const q = multiple(); // correct: Fe (0), Cu (2), Au (4)
    const correctTexts = ['Fe', 'Cu', 'Au'];
    const shuffled = shuffleOptions(q);
    const cArr = shuffled.c as number[];
    const answeredTexts = cArr.map(i => shuffled.o[i]).sort();
    expect(answeredTexts).toEqual(correctTexts.sort());
  });

  it('c remains an array', () => {
    const shuffled = shuffleOptions(multiple());
    expect(Array.isArray(shuffled.c)).toBe(true);
  });

  it('c length matches original', () => {
    const q = multiple();
    const shuffled = shuffleOptions(q);
    expect((shuffled.c as number[]).length).toBe((q.c as number[]).length);
  });

  it('does not mutate original', () => {
    const q = multiple();
    const origC = [...(q.c as number[])];
    shuffleOptions(q);
    expect(q.c).toEqual(origC);
  });
});

// ── shuffleOptions: matching ─────────────────────────────────────────────────

describe('shuffleOptions — matching', () => {
  it('does not shuffle pairs (preserves order)', () => {
    const q = matching();
    const shuffled = shuffleOptions(q);
    expect(shuffled.pairs).toEqual(q.pairs);
  });

  it('returns a deep copy (no mutation risk)', () => {
    const q = matching();
    const shuffled = shuffleOptions(q);
    shuffled.pairs![0][0] = 'MUTATED';
    expect(q.pairs![0][0]).toBe('KZ'); // original untouched
  });

  it('preserves type field', () => {
    const shuffled = shuffleOptions(matching());
    expect(shuffled.type).toBe('matching');
  });
});
