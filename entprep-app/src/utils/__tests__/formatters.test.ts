import { describe, it, expect } from 'vitest';
import { formatTime, formatTimeHMS, formatPercent, formatScore, pluralize } from '../formatters';

describe('formatTime', () => {
  it('formats 0 seconds', () => {
    expect(formatTime(0)).toBe('00:00');
  });

  it('formats seconds < 60', () => {
    expect(formatTime(45)).toBe('00:45');
  });

  it('formats exact minutes', () => {
    expect(formatTime(120)).toBe('02:00');
  });

  it('formats mixed minutes and seconds', () => {
    expect(formatTime(754)).toBe('12:34');
  });

  it('pads single digits', () => {
    expect(formatTime(61)).toBe('01:01');
  });
});

describe('formatTimeHMS', () => {
  it('formats 0 seconds', () => {
    expect(formatTimeHMS(0)).toBe('0:00:00');
  });

  it('formats hours', () => {
    expect(formatTimeHMS(3661)).toBe('1:01:01');
  });

  it('formats 4 hours (ЕНТ duration)', () => {
    expect(formatTimeHMS(14400)).toBe('4:00:00');
  });
});

describe('formatPercent', () => {
  it('returns 0% when total is 0', () => {
    expect(formatPercent(5, 0)).toBe('0%');
  });

  it('returns 0% when total is null', () => {
    expect(formatPercent(5, null)).toBe('0%');
  });

  it('calculates percentage', () => {
    expect(formatPercent(7, 10)).toBe('70%');
  });

  it('rounds down', () => {
    expect(formatPercent(1, 3)).toBe('33%');
  });

  it('returns 100%', () => {
    expect(formatPercent(10, 10)).toBe('100%');
  });
});

describe('formatScore', () => {
  it('formats score', () => {
    expect(formatScore(8, 10)).toBe('8/10');
  });

  it('formats zero', () => {
    expect(formatScore(0, 20)).toBe('0/20');
  });
});

describe('pluralize', () => {
  // Russian pluralization: [1 form, 2-4 form, 5+ form]
  const forms: [string, string, string] = ['тест', 'теста', 'тестов'];

  it('1 → singular', () => {
    expect(pluralize(1, forms)).toBe('тест');
  });

  it('2-4 → few', () => {
    expect(pluralize(2, forms)).toBe('теста');
    expect(pluralize(3, forms)).toBe('теста');
    expect(pluralize(4, forms)).toBe('теста');
  });

  it('5-20 → many', () => {
    expect(pluralize(5, forms)).toBe('тестов');
    expect(pluralize(11, forms)).toBe('тестов');
    expect(pluralize(19, forms)).toBe('тестов');
  });

  it('21 → singular again', () => {
    expect(pluralize(21, forms)).toBe('тест');
  });

  it('22-24 → few', () => {
    expect(pluralize(22, forms)).toBe('теста');
  });

  it('25 → many', () => {
    expect(pluralize(25, forms)).toBe('тестов');
  });

  it('100 → many', () => {
    expect(pluralize(100, forms)).toBe('тестов');
  });

  it('handles negative numbers', () => {
    expect(pluralize(-1, forms)).toBe('тест');
    expect(pluralize(-5, forms)).toBe('тестов');
  });
});
