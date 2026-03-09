// ── Payment configuration ─────────────────────────────────────────────────
// Monetization via RevenueCat (Google Play + App Store).

// Plans (reference — actual prices come from stores via RevenueCat)
export const PLANS = {
  monthly: { amount: 1990, label: 'monthly' },
  yearly:  { amount: 9990, label: 'yearly' },
} as const;

export type PlanType = keyof typeof PLANS;

// RevenueCat product IDs (must match store products)
export const RC_PRODUCT_IDS = {
  monthly: 'entprep_monthly',
  yearly: 'entprep_yearly',
} as const;
