// RevenueCat webhook — grants/revokes premium based on subscription events
import { CORS_HEADERS, corsResponse, activatePremium } from "./utils/shared.mjs";
import { timingSafeEqual } from "node:crypto";

export const config = { path: "/api/revenuecat-webhook" };

const WEBHOOK_SECRET = process.env.REVENUECAT_WEBHOOK_SECRET;

const SB_URL = process.env.VITE_SUPABASE_URL;
const SB_KEY = process.env.SUPABASE_SERVICE_KEY;

function sbHeaders() {
  return {
    apikey: SB_KEY,
    Authorization: `Bearer ${SB_KEY}`,
    "Content-Type": "application/json",
  };
}

// Events that grant premium
const GRANT_EVENTS = new Set([
  "INITIAL_PURCHASE",
  "RENEWAL",
  "PRODUCT_CHANGE",
  "UNCANCELLATION",
  "NON_RENEWING_PURCHASE",
]);

// Events that revoke premium
const REVOKE_EVENTS = new Set([
  "EXPIRATION",
  "BILLING_ISSUE",
]);

async function findUserById(userId) {
  const res = await fetch(`${SB_URL}/auth/v1/admin/users/${userId}`, {
    headers: sbHeaders(),
  });
  if (!res.ok) return null;
  return await res.json();
}

async function findUserByEmail(email) {
  const res = await fetch(
    `${SB_URL}/auth/v1/admin/users?filter=${encodeURIComponent(email)}&page=1&per_page=1`,
    { headers: sbHeaders() },
  );
  if (!res.ok) return null;
  const data = await res.json();
  return (data.users || []).find(u => u.email === email) || null;
}

async function revokePremium(userId, userMeta) {
  const res = await fetch(`${SB_URL}/auth/v1/admin/users/${userId}`, {
    method: "PUT",
    headers: sbHeaders(),
    body: JSON.stringify({
      user_metadata: { ...userMeta, is_premium: false, premium_until: null },
    }),
  });
  if (!res.ok) throw new Error("Failed to revoke premium: " + await res.text());
}

async function resolveUser(event) {
  const appUserID = event.app_user_id;
  const email = event.subscriber_attributes?.$email?.value;

  // appUserID is set to Supabase user ID during loginPurchases
  if (appUserID && !appUserID.startsWith("$RCAnonymousID:")) {
    const user = await findUserById(appUserID);
    if (user) return user;
  }

  // Fallback: look up by email subscriber attribute
  if (email) {
    return await findUserByEmail(email);
  }

  return null;
}

function determinePlan(event) {
  const productId = event.product_id || "";
  if (productId.includes("yearly") || productId.includes("annual")) return "yearly";
  return "monthly";
}

export default async function handler(req) {
  if (req.method === "OPTIONS") return corsResponse();

  if (req.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405, headers: CORS_HEADERS });
  }

  // Verify webhook secret (timing-safe comparison)
  const authHeader = req.headers.get("authorization") || "";
  const expected = `Bearer ${WEBHOOK_SECRET || ""}`;
  const headerBuf = Buffer.from(authHeader);
  const expectedBuf = Buffer.from(expected);
  if (!WEBHOOK_SECRET || headerBuf.length !== expectedBuf.length || !timingSafeEqual(headerBuf, expectedBuf)) {
    return Response.json({ error: "Unauthorized" }, { status: 401, headers: CORS_HEADERS });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400, headers: CORS_HEADERS });
  }

  const event = body.event;
  if (!event) {
    return Response.json({ error: "No event" }, { status: 400, headers: CORS_HEADERS });
  }

  const eventType = event.type;
  const isGrant = GRANT_EVENTS.has(eventType);
  const isRevoke = REVOKE_EVENTS.has(eventType);

  if (!isGrant && !isRevoke) {
    // Event we don't handle (e.g., CANCELLATION — still active until period ends)
    return Response.json({ ok: true, skipped: eventType }, { status: 200, headers: CORS_HEADERS });
  }

  try {
    const user = await resolveUser(event);
    if (!user) {
      console.error(`RC webhook: user not found for event ${eventType}`, event.app_user_id);
      return Response.json({ error: "User not found" }, { status: 404, headers: CORS_HEADERS });
    }

    if (isGrant) {
      const plan = determinePlan(event);
      const premiumUntil = await activatePremium({
        userId: user.id,
        userMeta: user.user_metadata || {},
        plan,
        kaspiTxId: `rc_${event.id || eventType}`,
      });
      console.log(`RC webhook: premium granted to ${user.id} until ${premiumUntil}`);
    } else {
      await revokePremium(user.id, user.user_metadata || {});
      console.log(`RC webhook: premium revoked for ${user.id}`);
    }

    return Response.json({ ok: true }, { status: 200, headers: CORS_HEADERS });
  } catch (err) {
    console.error("RC webhook error:", err);
    return Response.json({ error: "Internal error" }, { status: 500, headers: CORS_HEADERS });
  }
}
