import { CORS_HEADERS, corsResponse, verifyAuth, createRateLimiter, rateLimitResponse } from "./utils/shared.mjs";

const SB_URL = process.env.VITE_SUPABASE_URL;
const SB_KEY = process.env.SUPABASE_SERVICE_KEY;

const checkRate = createRateLimiter("push-subscribe", { max: 20, windowSec: 60 });

export default async function handler(req) {
  if (req.method === "OPTIONS") return corsResponse();
  if (req.method !== "POST")
    return Response.json({ error: "Method not allowed" }, { status: 405, headers: CORS_HEADERS });

  const rl = checkRate(req);
  if (rl) return rateLimitResponse(rl);

  const user = await verifyAuth(req);
  if (!user)
    return Response.json({ error: "Unauthorized" }, { status: 401, headers: CORS_HEADERS });

  let body;
  try { body = await req.json(); } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400, headers: CORS_HEADERS });
  }
  const { action } = body;

  if (action === "subscribe") {
    const { subscription } = body;
    if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
      return Response.json({ error: "Invalid subscription" }, { status: 400, headers: CORS_HEADERS });
    }

    const res = await fetch(`${SB_URL}/rest/v1/push_subscriptions`, {
      method: "POST",
      headers: {
        apikey: SB_KEY,
        Authorization: `Bearer ${SB_KEY}`,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates,return=minimal",
      },
      body: JSON.stringify({
        user_id: user.id,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("push_subscriptions upsert failed:", text);
      return Response.json({ error: "DB error" }, { status: 500, headers: CORS_HEADERS });
    }

    return Response.json({ ok: true }, { headers: CORS_HEADERS });
  }

  if (action === "unsubscribe") {
    const { endpoint } = body;
    if (!endpoint)
      return Response.json({ error: "Missing endpoint" }, { status: 400, headers: CORS_HEADERS });

    await fetch(
      `${SB_URL}/rest/v1/push_subscriptions?user_id=eq.${user.id}&endpoint=eq.${encodeURIComponent(endpoint)}`,
      {
        method: "DELETE",
        headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` },
      }
    );

    return Response.json({ ok: true }, { headers: CORS_HEADERS });
  }

  // ── Update preferences: sync toggles from Settings ─────────────────────
  if (action === "update_prefs") {
    const { prefs } = body;
    if (!prefs || typeof prefs !== "object")
      return Response.json({ error: "Missing prefs" }, { status: 400, headers: CORS_HEADERS });

    const update = {};
    if (typeof prefs.streak === "boolean") update.pref_streak = prefs.streak;
    if (typeof prefs.errors === "boolean") update.pref_errors = prefs.errors;
    if (typeof prefs.weekly === "boolean") update.pref_weekly = prefs.weekly;

    if (!Object.keys(update).length)
      return Response.json({ error: "No valid prefs" }, { status: 400, headers: CORS_HEADERS });

    // Update ALL subscriptions for this user (they may have multiple devices)
    const res = await fetch(
      `${SB_URL}/rest/v1/push_subscriptions?user_id=eq.${user.id}`,
      {
        method: "PATCH",
        headers: {
          apikey: SB_KEY,
          Authorization: `Bearer ${SB_KEY}`,
          "Content-Type": "application/json",
          Prefer: "return=minimal",
        },
        body: JSON.stringify(update),
      }
    );

    if (!res.ok) {
      const text = await res.text();
      console.error("push prefs update failed:", text);
      return Response.json({ error: "DB error" }, { status: 500, headers: CORS_HEADERS });
    }

    return Response.json({ ok: true }, { headers: CORS_HEADERS });
  }

  return Response.json({ error: "Unknown action" }, { status: 400, headers: CORS_HEADERS });
}
