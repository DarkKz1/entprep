// Kaspi Webpay payment webhook
//
// INTEGRATION STEPS (when Kaspi Webpay is approved):
// 1. Set KASPI_WEBHOOK_SECRET env var on Netlify
// 2. Register this URL as webhook in Kaspi merchant dashboard:
//    https://entprep.netlify.app/api/payment-webhook
// 3. Update the field mapping below to match Kaspi's actual payload format
//    (field names like txn_id, account, amount — will come from Kaspi docs)
// 4. Set KASPI_ENABLED=true in src/config/payment.ts
//
// Until then, premium is activated manually via Admin panel → Premium tab.

import { findUserByEmail, activatePremium } from "./utils/shared.mjs";

const SB_URL = process.env.VITE_SUPABASE_URL;
const SB_KEY = process.env.SUPABASE_SERVICE_KEY;
const KASPI_WEBHOOK_SECRET = process.env.KASPI_WEBHOOK_SECRET;

// ── Kaspi payload mapping ───────────────────────────────────────────────────
// Kaspi Webpay sends a POST with transaction data. Map their field names here.
// TODO: Update these when you receive Kaspi API documentation.
//
// Typical Kaspi Webpay callback fields (estimated):
//   txn_id     — unique transaction ID
//   account    — customer identifier (we use email)
//   sum        — payment amount in tenge
//   command    — "check" (verify account) or "pay" (confirm payment)
//
function parseKaspiPayload(body) {
  return {
    txnId:   body.txn_id   || body.transactionId || body.id,
    email:   body.account  || body.email,
    amount:  body.sum      || body.amount,
    command: body.command   || "pay",     // "check" or "pay"
  };
}

// Determine plan from amount
function planFromAmount(amount) {
  const num = Number(amount);
  if (num >= 4000) return "yearly";
  return "monthly";
}

// ── Duplicate check ─────────────────────────────────────────────────────────
async function isDuplicate(txnId) {
  const res = await fetch(
    `${SB_URL}/rest/v1/payments?kaspi_tx_id=eq.${encodeURIComponent(txnId)}&limit=1`,
    { headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, Prefer: "return=representation" } },
  );
  if (!res.ok) return false;
  const rows = await res.json();
  return rows.length > 0;
}

// ── Handler ─────────────────────────────────────────────────────────────────
export default async function handler(req) {
  if (req.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  // Verify webhook secret
  const secret = req.headers.get("x-kaspi-secret")
    || req.headers.get("authorization")
    || new URL(req.url).searchParams.get("secret");
  if (!KASPI_WEBHOOK_SECRET || secret !== KASPI_WEBHOOK_SECRET) {
    console.error("Payment webhook: invalid secret");
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body;
  try { body = await req.json(); } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { txnId, email, amount, command } = parseKaspiPayload(body);
  console.log(`Payment webhook: command=${command} txn=${txnId} email=${email} amount=${amount}`);

  if (!txnId || !email) {
    return Response.json({ error: "Missing txn_id or account (email)" }, { status: 400 });
  }

  // ── Check command: verify that the account (email) exists ─────────────
  if (command === "check") {
    const user = await findUserByEmail(email);
    if (!user) {
      // Kaspi expects specific response codes — adjust format per docs
      return Response.json({ result: 1, comment: "User not found" });
    }
    return Response.json({ result: 0, comment: "OK" });
  }

  // ── Pay command: activate premium ─────────────────────────────────────
  try {
    if (await isDuplicate(txnId)) {
      return Response.json({ result: 0, comment: "Already processed" });
    }

    const user = await findUserByEmail(email);
    if (!user) {
      return Response.json({ result: 1, comment: "User not found" });
    }

    const plan = planFromAmount(amount);
    const premiumUntil = await activatePremium({
      userId: user.id,
      userMeta: user.user_metadata,
      plan,
      kaspiTxId: String(txnId),
    });

    console.log(`Payment webhook: activated ${email} plan=${plan} until=${premiumUntil}`);
    return Response.json({ result: 0, comment: "OK", premium_until: premiumUntil });
  } catch (err) {
    console.error("Payment webhook error:", err);
    return Response.json({ result: 2, comment: err.message || "Server error" }, { status: 500 });
  }
}

export const config = { path: "/api/payment-webhook" };
