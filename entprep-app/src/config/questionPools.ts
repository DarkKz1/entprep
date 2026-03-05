import { getPoolSize, getTotalQ } from '../utils/questionStore';
import { ALL_PROFILES_BASE, SUBS_BASE } from './subjects';
import type { SubjectConfig, ProfileSubject } from '../types/index';

export const TOTAL_Q: number = getTotalQ();

export const ALL_PROFILES: ProfileSubject[] = ALL_PROFILES_BASE.map(p => ({
  ...p,
  pool: getPoolSize(p.id),
}));

export const SUBS: Record<string, SubjectConfig> = Object.fromEntries(
  Object.entries(SUBS_BASE).map(([k, v]) => [k, {
    ...v,
    pool: getPoolSize(k),
  }])
);
