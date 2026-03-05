export const SCREENS = {
  HOME: 'home',
  PROFILE: 'profile',
  SUBJECT: 'topics',
  TEST: 'test',
  FULL_ENT: 'fullent',
  CALC: 'calc',
  PROGRESS: 'prog',
  SETTINGS: 'set',
  ADAPTIVE: 'adaptive',
  ERROR_REVIEW: 'errors',
  ADMIN: 'admin',
  CHALLENGE: 'challenge',
  LEADERBOARD: 'leaderboard',
  FRIENDS: 'friends',
  DUEL: 'duel',
} as const;

export type Screen = (typeof SCREENS)[keyof typeof SCREENS];
