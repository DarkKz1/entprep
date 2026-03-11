import type { SRCard, TestResult } from '../types/index';

const MAX_INTERVAL = 60;
const MIN_EASE = 1.3;
const DEFAULT_EASE = 2.5;

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function addDays(iso: string, days: number): string {
  const d = new Date(iso + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Create a new SR card from a wrong answer */
export function createCard(sid: string, oi: number): SRCard {
  return {
    sid,
    oi,
    interval: 0,
    ease: DEFAULT_EASE,
    due: todayISO(), // due immediately
    reps: 0,
    lapses: 0,
  };
}

/** SM-2 simplified: review a card as correct/wrong, return updated card */
export function reviewCard(card: SRCard, correct: boolean): SRCard {
  const today = todayISO();
  if (correct) {
    const reps = card.reps + 1;
    let interval: number;
    if (reps === 1) interval = 1;
    else if (reps === 2) interval = 3;
    else interval = Math.round(card.interval * card.ease);
    interval = Math.min(interval, MAX_INTERVAL);
    const ease = Math.max(MIN_EASE, card.ease + 0.1);
    return { ...card, reps, interval, ease, due: addDays(today, interval) };
  } else {
    return {
      ...card,
      reps: 0,
      interval: 1,
      lapses: card.lapses + 1,
      ease: Math.max(MIN_EASE, card.ease - 0.2),
      due: addDays(today, 1),
    };
  }
}

/** Get all cards due today or earlier */
export function getDueCards(cards: SRCard[], today?: string): SRCard[] {
  const t = today || todayISO();
  return cards.filter(c => c.due <= t);
}

/** Count due cards */
export function getDueCount(cards: SRCard[], today?: string): number {
  return getDueCards(cards, today).length;
}

/** Unique key for a card */
function cardKey(sid: string, oi: number): string {
  return `${sid}:${oi}`;
}

/** Add wrong answers from a test result, deduping against existing cards.
 *  Existing cards are NOT overwritten with fresh ones (preserves review history). */
export function addWrongAnswers(existing: SRCard[], result: TestResult): SRCard[] {
  if (!result.qd) return existing;
  const wrongOis = result.qd.filter(q => !q.ok).map(q => q.oi);
  if (wrongOis.length === 0) return existing;

  const existingKeys = new Set(existing.map(c => cardKey(c.sid, c.oi)));
  const newCards: SRCard[] = [];

  for (const oi of wrongOis) {
    const sid = result.su;
    const key = cardKey(sid, oi);
    if (!existingKeys.has(key)) {
      newCards.push(createCard(sid, oi));
      existingKeys.add(key);
    }
  }

  return newCards.length > 0 ? [...existing, ...newCards] : existing;
}

/** Merge SR cards from two sources (e.g., cloud + local).
 *  Deduplicate by sid:oi, keep the card with the later due date. */
export function mergeSrCards(a: SRCard[], b: SRCard[]): SRCard[] {
  const map = new Map<string, SRCard>();
  for (const card of a) {
    map.set(cardKey(card.sid, card.oi), card);
  }
  for (const card of b) {
    const key = cardKey(card.sid, card.oi);
    const existing = map.get(key);
    if (!existing || card.due > existing.due) {
      map.set(key, card);
    }
  }
  return Array.from(map.values());
}
