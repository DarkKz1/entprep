// ── Payment configuration ─────────────────────────────────────────────────
// Single source of truth for all payment-related constants.
//
// WHEN KASPI WEBPAY IS APPROVED:
// 1. Set KASPI_ENABLED = true
// 2. Set KASPI_MERCHANT_ID = 'your_id'
// 3. Set FREE_PREMIUM = false in AuthContext.tsx

export const KASPI_ENABLED = false;

// Kaspi merchant ID — provided after Kaspi Webpay partnership approval
export const KASPI_MERCHANT_ID = '';

// Kaspi payment base URL
export const KASPI_PAY_URL = KASPI_MERCHANT_ID
  ? `https://kaspi.kz/pay/${KASPI_MERCHANT_ID}`
  : '';

// Plans
export const PLANS = {
  monthly: { amount: 1990, label: 'monthly' },
  yearly:  { amount: 4990, label: 'yearly' },
} as const;

export type PlanType = keyof typeof PLANS;

// Build Kaspi payment link for a plan
export function getKaspiPayUrl(plan: PlanType): string {
  if (!KASPI_PAY_URL) return '';
  return `${KASPI_PAY_URL}?amount=${PLANS[plan].amount}`;
}
