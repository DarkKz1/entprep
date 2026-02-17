import { getPoolSize, getTotalQ } from '../utils/questionStore.js';
import { ALL_PROFILES_BASE, SUBS_BASE } from './subjects.js';

const TOTAL_Q = getTotalQ();

const ALL_PROFILES = ALL_PROFILES_BASE.map(p => ({
  ...p,
  pool: getPoolSize(p.id),
}));

const SUBS = Object.fromEntries(
  Object.entries(SUBS_BASE).map(([k, v]) => [k, {
    ...v,
    pool: getPoolSize(k),
  }])
);

export { TOTAL_Q, ALL_PROFILES, SUBS };
