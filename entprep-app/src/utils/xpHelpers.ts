import { COLORS } from '../constants/styles';
import type { TestResult } from '../types/index';

export interface LevelInfo {
  level: number;
  name: string;
  minXP: number;
  color: string;
}

export interface LevelProgress extends LevelInfo {
  totalXP: number;
  nextXP: number;   // XP needed for next level (Infinity for max)
  progress: number;  // 0–1 fraction to next level
}

export const LEVELS: LevelInfo[] = [
  { level: 1, name: 'Новичок',    minXP: 0,    color: '#94a3b8' },
  { level: 2, name: 'Ученик',     minXP: 100,  color: COLORS.green },
  { level: 3, name: 'Знаток',     minXP: 350,  color: COLORS.teal },
  { level: 4, name: 'Мастер',     minXP: 800,  color: COLORS.accentDark },
  { level: 5, name: 'Эксперт',    minXP: 1800, color: COLORS.amber },
  { level: 6, name: 'Гений ЕНТ',  minXP: 4000, color: COLORS.red },
];

/** XP earned from a single test result */
export function calcTestXP(result: TestResult): number {
  if (result.type === 'fullent' && result.sections) {
    const sections = result.sections as unknown as Array<{ pts?: number; maxPts?: number; correct?: number; total?: number }>;
    let totalPts = 0;
    if (Array.isArray(sections)) {
      totalPts = sections.reduce((s, r) => s + (r.pts ?? 0), 0);
    } else {
      // sections might be Record<string, ...> in older data
      totalPts = Object.values(sections as Record<string, { pts?: number }>).reduce((s, r) => s + (r.pts ?? 0), 0);
    }
    const pct = totalPts / 140 * 100;
    return Math.round(pct * 0.7) + (pct >= 100 ? 5 : 0);
  }

  // Regular test
  const sc = result.sc ?? 0;
  return Math.round(sc * 0.3) + (sc === 100 ? 5 : 0);
}

/** Total XP from all history */
export function calcTotalXP(hist: TestResult[]): number {
  return hist.reduce((sum, r) => sum + calcTestXP(r), 0);
}

/** XP earned today */
export function getTodayXP(hist: TestResult[]): number {
  const today = new Date().toLocaleDateString('ru-RU');
  return hist.filter(r => r.dt === today).reduce((sum, r) => sum + calcTestXP(r), 0);
}

/** Get current level + progress to next */
export function getLevel(totalXP: number): LevelProgress {
  let current = LEVELS[0];
  for (const lvl of LEVELS) {
    if (totalXP >= lvl.minXP) current = lvl;
    else break;
  }

  const idx = LEVELS.indexOf(current);
  const isMax = idx === LEVELS.length - 1;
  const nextXP = isMax ? current.minXP : LEVELS[idx + 1].minXP;
  const range = nextXP - current.minXP;
  const progress = isMax ? 1 : range > 0 ? (totalXP - current.minXP) / range : 0;

  return { ...current, totalXP, nextXP, progress };
}
