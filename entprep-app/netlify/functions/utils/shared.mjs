// Shared utilities for Netlify Functions: CORS, auth, rate limiting, validation, premium

import { VALID_SUBJECTS, PLANS } from "./constants.mjs";

// ── CORS ────────────────────────────────────────────────────────────────────

const ORIGIN = process.env.ALLOWED_ORIGIN || "https://entprep.netlify.app";

export const CORS_HEADERS = {
  "Access-Control-Allow-Origin": ORIGIN,
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

export function corsResponse() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

// ── Auth ────────────────────────────────────────────────────────────────────

export async function verifyAuth(req) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  const token = authHeader.slice(7);
  try {
    const res = await fetch(`${process.env.VITE_SUPABASE_URL}/auth/v1/user`, {
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: process.env.VITE_SUPABASE_ANON_KEY,
      },
    });
    if (!res.ok) return null;
    return await res.json(); // { id, email, ... }
  } catch {
    return null;
  }
}

// ── Rate Limiter (in-memory, per function instance) ─────────────────────────

const stores = {};

export function createRateLimiter(name, { max = 20, windowSec = 60 } = {}) {
  const store = (stores[name] = new Map());
  const windowMs = windowSec * 1000;

  return (userId) => {
    const now = Date.now();

    // Cleanup old entries when map grows too large
    if (store.size > 500) {
      const cutoff = now - windowMs;
      for (const [k, v] of store) {
        if (v.start < cutoff) store.delete(k);
      }
    }

    const entry = store.get(userId);
    if (!entry || now - entry.start > windowMs) {
      store.set(userId, { count: 1, start: now });
      return null; // allowed
    }
    if (entry.count >= max) {
      const retryAfter = Math.ceil((entry.start + windowMs - now) / 1000);
      return retryAfter; // blocked — return seconds to wait
    }
    entry.count++;
    return null; // allowed
  };
}

export function rateLimitResponse(retryAfter) {
  return Response.json(
    { error: "Слишком много запросов. Подождите." },
    { status: 429, headers: { ...CORS_HEADERS, "Retry-After": String(retryAfter) } }
  );
}

// ── Validation ──────────────────────────────────────────────────────────────

// VALID_SUBJECTS imported from ./constants.mjs

export function validateExplain(body) {
  const { question, options, correctAnswer, userAnswer, questionType, pairs } = body;
  if (typeof question !== "string" || question.length < 3 || question.length > 2000) return "Invalid question";

  const qType = questionType || 'single';

  if (qType === 'matching') {
    // Matching: pairs required, options/correctAnswer optional
    if (!Array.isArray(pairs) || pairs.length === 0 || pairs.length > 10) return "Invalid pairs";
    if (!pairs.every(p => Array.isArray(p) && p.length === 2)) return "Invalid pair format";
    if (userAnswer !== undefined && (typeof userAnswer !== "object" || userAnswer === null)) return "Invalid userAnswer for matching";
  } else if (qType === 'multiple') {
    // Multiple choice: options 4-6, correctAnswer is array of indices
    if (!Array.isArray(options) || options.length < 4 || options.length > 6) return "Options must be array of 4-6";
    if (!options.every(o => typeof o === "string" && o.length > 0 && o.length <= 500)) return "Invalid option";
    if (!Array.isArray(correctAnswer) && typeof correctAnswer !== "number") return "Invalid correctAnswer for multiple";
    if (userAnswer !== undefined && !Array.isArray(userAnswer)) return "Invalid userAnswer for multiple";
  } else {
    // Single choice (default)
    if (!Array.isArray(options) || options.length < 2 || options.length > 6) return "Options must be array of 2-6";
    if (!options.every(o => typeof o === "string" && o.length > 0 && o.length <= 500)) return "Invalid option";
    const cIdx = Array.isArray(correctAnswer) ? correctAnswer[0] : correctAnswer;
    if (typeof cIdx !== "number" || cIdx < 0 || cIdx >= options.length) return "Invalid correctAnswer";
    if (userAnswer !== undefined && typeof userAnswer !== "number") return "Invalid userAnswer";
  }

  return null;
}

export function validateGenerate(body) {
  const { subject, topic, examples } = body;
  if (!subject || !VALID_SUBJECTS.includes(subject)) return "Invalid subject";
  if (topic !== undefined && (typeof topic !== "string" || topic.length > 200)) return "Invalid topic";
  if (!Array.isArray(examples) || examples.length === 0 || examples.length > 10) return "Invalid examples";
  for (const ex of examples) {
    if (!ex.q || typeof ex.q !== "string" || ex.q.length > 2000) return "Invalid example question";
    if (!Array.isArray(ex.o) || ex.o.length !== 4) return "Invalid example options";
    if (typeof ex.c !== "number" || ex.c < 0 || ex.c > 3) return "Invalid example answer";
    if (!ex.e || typeof ex.e !== "string" || ex.e.trim().length < 15) return "Invalid example explanation";
  }
  return null;
}

export function validatePlan(body) {
  const { weak, overall, totalTests, streak } = body;
  if (!Array.isArray(weak)) return "Invalid weak subjects";
  if (typeof overall !== "number" || overall < 0 || overall > 100) return "Invalid overall score";
  if (typeof totalTests !== "number" || totalTests < 0 || totalTests > 100000) return "Invalid totalTests";
  if (streak !== undefined && (typeof streak !== "number" || streak < 0)) return "Invalid streak";
  return null;
}

// ── Premium activation ──────────────────────────────────────────────────────
// Shared logic used by admin-action (manual) and payment-webhook (Kaspi).
// Looks up user by email, sets is_premium + premium_until in user_metadata,
// inserts a payment record.

const SB_URL_SHARED = process.env.VITE_SUPABASE_URL;
const SB_KEY_SHARED = process.env.SUPABASE_SERVICE_KEY;

function sbHeadersShared() {
  return {
    apikey: SB_KEY_SHARED,
    Authorization: `Bearer ${SB_KEY_SHARED}`,
    "Content-Type": "application/json",
  };
}

export function calcPremiumUntil(plan) {
  const now = new Date();
  if (plan === "monthly") {
    return new Date(now.getFullYear(), now.getMonth() + 1, now.getDate()).toISOString();
  }
  // yearly = until June 30 of current school year
  const june30 = new Date(now.getMonth() >= 8 ? now.getFullYear() + 1 : now.getFullYear(), 5, 30);
  return june30.toISOString();
}

export async function findUserByEmail(email) {
  const res = await fetch(
    `${SB_URL_SHARED}/auth/v1/admin/users?filter=${encodeURIComponent(email)}&page=1&per_page=1`,
    { headers: sbHeadersShared() },
  );
  if (!res.ok) throw new Error("Failed to look up user: " + await res.text());
  const data = await res.json();
  return (data.users || []).find(u => u.email === email) || null;
}

export async function activatePremium({ userId, userMeta, plan, kaspiTxId }) {
  const premiumUntil = calcPremiumUntil(plan);
  const amount = PLANS[plan]?.amount || (plan === "monthly" ? 1990 : 9990);

  // Update user_metadata via Supabase Auth Admin API
  const updateRes = await fetch(`${SB_URL_SHARED}/auth/v1/admin/users/${userId}`, {
    method: "PUT",
    headers: sbHeadersShared(),
    body: JSON.stringify({
      user_metadata: { ...userMeta, is_premium: true, premium_until: premiumUntil },
    }),
  });
  if (!updateRes.ok) throw new Error("Failed to update user: " + await updateRes.text());

  // Insert payment record
  const insertRes = await fetch(`${SB_URL_SHARED}/rest/v1/payments`, {
    method: "POST",
    headers: { ...sbHeadersShared(), Prefer: "return=minimal" },
    body: JSON.stringify({
      user_id: userId,
      amount,
      plan,
      kaspi_tx_id: kaspiTxId || "manual",
      status: "completed",
      premium_until: premiumUntil,
    }),
  });
  if (!insertRes.ok) throw new Error("Failed to insert payment: " + await insertRes.text());

  return premiumUntil;
}
