import type { ENTConfigType, ProfileBlock } from '../types/index';

// ==================== ENT SCHEDULE 2026 ====================
// Dates for registration and exam periods
// Source: testcenter.kz, liter.kz, tengrinews.kz (Feb 2026)

export type PeriodKey = 'january' | 'march' | 'main' | 'august';

export interface EntPeriod {
  key: PeriodKey;
  regStart: string;   // YYYY-MM-DD
  regEnd: string;
  examStart: string;
  examEnd: string;
}

// Update these annually when НЦТ publishes new dates
export const ENT_SCHEDULE: EntPeriod[] = [
  {
    key: 'january',
    regStart: '2025-12-22', regEnd: '2025-12-30',
    examStart: '2026-01-10', examEnd: '2026-02-10',
  },
  {
    key: 'march',
    regStart: '2026-02-15', regEnd: '2026-02-25',
    examStart: '2026-03-01', examEnd: '2026-04-06',
  },
  {
    key: 'main',
    regStart: '2026-04-28', regEnd: '2026-05-14',
    examStart: '2026-05-16', examEnd: '2026-07-05',
  },
  {
    key: 'august',
    regStart: '2026-07-15', regEnd: '2026-07-25',
    examStart: '2026-08-01', examEnd: '2026-08-20',
  },
  // Next year — jan 2027
  {
    key: 'january',
    regStart: '2026-12-22', regEnd: '2026-12-30',
    examStart: '2027-01-10', examEnd: '2027-02-10',
  },
];

export type CountdownPhase = 'reg_open' | 'before_exam' | 'exam_now' | 'before_reg';

export interface EntCountdown {
  phase: CountdownPhase;
  periodKey: PeriodKey;
  targetDate: Date;
  daysLeft: number;
  urgent: boolean;  // < 7 days
}

/** Returns the most relevant upcoming ENT event */
export function getEntCountdown(now: Date = new Date()): EntCountdown | null {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  for (const p of ENT_SCHEDULE) {
    const regStart = parseDate(p.regStart);
    const regEnd = parseDate(p.regEnd);
    const examStart = parseDate(p.examStart);
    const examEnd = parseDate(p.examEnd);

    // Phase 1: Registration is open now
    if (today >= regStart && today <= regEnd) {
      const days = diffDays(today, regEnd);
      return { phase: 'reg_open', periodKey: p.key, targetDate: regEnd, daysLeft: days, urgent: days <= 3 };
    }

    // Phase 2: Registration closed, exam ahead
    if (today > regEnd && today < examStart) {
      const days = diffDays(today, examStart);
      return { phase: 'before_exam', periodKey: p.key, targetDate: examStart, daysLeft: days, urgent: days <= 7 };
    }

    // Phase 3: Exam is happening now
    if (today >= examStart && today <= examEnd) {
      return { phase: 'exam_now', periodKey: p.key, targetDate: examEnd, daysLeft: diffDays(today, examEnd), urgent: false };
    }

    // Phase 4: Next registration is in the future
    if (today < regStart) {
      const days = diffDays(today, regStart);
      return { phase: 'before_reg', periodKey: p.key, targetDate: regStart, daysLeft: days, urgent: days <= 7 };
    }
  }

  return null;
}

/** Returns future ENT periods (examStart > today) for goal selection */
export function getUpcomingPeriods(now: Date = new Date()): { key: PeriodKey; examStart: string }[] {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return ENT_SCHEDULE
    .filter(p => parseDate(p.examStart) > today)
    .map(p => ({ key: p.key, examStart: p.examStart }));
}

function parseDate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function diffDays(from: Date, to: Date): number {
  return Math.max(0, Math.ceil((to.getTime() - from.getTime()) / 86400000));
}

export const PROFILE_BLOCKS: ProfileBlock[] = [
  { key: 'single',   label: 'Одиночный выбор',    range: [0, 24],  count: 25, questionType: 'single',   ptsPerQ: 1 },
  { key: 'context',  label: 'Контекстные',        range: [25, 29], count: 5,  questionType: 'single',   ptsPerQ: 1 },
  { key: 'multiple', label: 'Множественный выбор', range: [30, 34], count: 5,  questionType: 'multiple', ptsPerQ: 2 },
  { key: 'matching', label: 'Соответствие',       range: [35, 39], count: 5,  questionType: 'matching',  ptsPerQ: 2 },
];

export const ENT_CONFIG: ENTConfigType = {
  totalTime: 240 * 60,
  sections: [
    { sid: "history", label: "История РК", icon: "\uD83C\uDFDB\uFE0F", cnt: 20, maxPts: 20, threshold: 5, ptsPerQ: 1 },
    { sid: "math", label: "Мат. грамотность", icon: "\uD83D\uDCD0", cnt: 10, maxPts: 10, threshold: 3, ptsPerQ: 1 },
    { sid: "reading", label: "Грамотность чтения", icon: "\uD83D\uDCD6", cnt: 10, maxPts: 10, threshold: 3, ptsPerQ: 1 },
  ],
  profileCnt: 40,
  profileMaxPts: 50,
  profileThreshold: 5,
  profilePtsPerQ: 1.25, // average for backward compat
  profileBlocks: PROFILE_BLOCKS,
};
