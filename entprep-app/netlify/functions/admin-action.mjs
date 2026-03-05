// Admin actions: update/delete/insert questions, dismiss reports
// Uses Supabase REST API with service key (bypasses RLS)
// No supabase-js dependency — pure fetch for Netlify Functions compatibility

import { CORS_HEADERS, corsResponse, verifyAuth, findUserByEmail, activatePremium } from "./utils/shared.mjs";
import { tokenize, jaccard, checkGenerated } from "./utils/quality.mjs";
import { JACCARD_THRESHOLD } from "./utils/constants.mjs";

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "")
  .split(",").map(e => e.trim()).filter(Boolean);

const SB_URL = process.env.VITE_SUPABASE_URL;
const SB_KEY = process.env.SUPABASE_SERVICE_KEY;

// Supabase REST helpers (service key = bypass RLS)
const sbHeaders = {
  apikey: SB_KEY,
  Authorization: `Bearer ${SB_KEY}`,
  "Content-Type": "application/json",
  Prefer: "return=minimal",
};

async function sbSelect(table, query) {
  const res = await fetch(`${SB_URL}/rest/v1/${table}?${query}`, {
    headers: { ...sbHeaders, Prefer: "return=representation" },
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function sbInsert(table, row) {
  const res = await fetch(`${SB_URL}/rest/v1/${table}`, {
    method: "POST",
    headers: sbHeaders,
    body: JSON.stringify(row),
  });
  if (!res.ok) throw new Error(await res.text());
}

async function sbUpdate(table, filter, data) {
  const res = await fetch(`${SB_URL}/rest/v1/${table}?${filter}`, {
    method: "PATCH",
    headers: sbHeaders,
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(await res.text());
}

async function sbDelete(table, filter) {
  const res = await fetch(`${SB_URL}/rest/v1/${table}?${filter}`, {
    method: "DELETE",
    headers: sbHeaders,
  });
  if (!res.ok) throw new Error(await res.text());
}

export default async function handler(req) {
  if (req.method === "OPTIONS") return corsResponse();
  if (req.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405, headers: CORS_HEADERS });
  }

  // Auth check
  const user = await verifyAuth(req);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401, headers: CORS_HEADERS });
  if (!ADMIN_EMAILS.includes(user.email)) {
    return Response.json({ error: "Forbidden" }, { status: 403, headers: CORS_HEADERS });
  }

  let body;
  try { body = await req.json(); } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400, headers: CORS_HEADERS });
  }

  const { action } = body;

  try {
    switch (action) {
      case "update_question": {
        const { id, q, o, c, e } = body;
        if (!id) return Response.json({ error: "Missing id" }, { status: 400, headers: CORS_HEADERS });

        // Quality check before update (same as insert)
        if (q && Array.isArray(o) && o.length === 4 && typeof c === "number") {
          const issues = checkGenerated(q, o, c, e, body.subject);
          if (issues.length > 0) {
            return Response.json(
              { error: `Качество: ${issues[0]}`, issues },
              { status: 422, headers: CORS_HEADERS }
            );
          }
        }

        await sbUpdate("questions", `id=eq.${id}`, { q, o, c, e });
        return Response.json({ ok: true }, { headers: CORS_HEADERS });
      }

      case "delete_question": {
        const { id } = body;
        if (!id) return Response.json({ error: "Missing id" }, { status: 400, headers: CORS_HEADERS });
        await sbDelete("questions", `id=eq.${id}`);
        return Response.json({ ok: true }, { headers: CORS_HEADERS });
      }

      case "dismiss_reports": {
        const { question_id } = body;
        if (!question_id) return Response.json({ error: "Missing question_id" }, { status: 400, headers: CORS_HEADERS });
        await sbDelete("question_reports", `question_id=eq.${question_id}`);
        await sbUpdate("questions", `id=eq.${question_id}`, { report_count: 0 });
        return Response.json({ ok: true }, { headers: CORS_HEADERS });
      }

      case "insert_question": {
        const { subject, topic, q, o, c, e } = body;
        if (!subject || !q || !Array.isArray(o)) {
          return Response.json({ error: "Missing fields" }, { status: 400, headers: CORS_HEADERS });
        }

        // Quality check before insert
        if (Array.isArray(o) && o.length === 4 && typeof c === "number") {
          const issues = checkGenerated(q, o, c, e, subject);
          if (issues.length > 0) {
            return Response.json(
              { error: `Качество: ${issues[0]}`, issues },
              { status: 422, headers: CORS_HEADERS }
            );
          }
        }

        // Duplicate check: fetch recent 1000 questions for this subject, run Jaccard
        const existing = await sbSelect(
          "questions",
          `select=q&subject=eq.${subject}&order=idx.desc&limit=1000`
        );
        const newTokens = tokenize(q);
        for (const row of existing) {
          const sim = jaccard(newTokens, tokenize(row.q));
          if (sim >= JACCARD_THRESHOLD) {
            return Response.json(
              { error: `Дубликат (${Math.round(sim * 100)}% совпадение): "${row.q.slice(0, 80)}..."` },
              { status: 409, headers: CORS_HEADERS }
            );
          }
        }

        const row = { subject, topic, q, o, c, e };
        if (body.q_kk) { row.q_kk = body.q_kk; row.o_kk = body.o_kk; row.e_kk = body.e_kk; }
        await sbInsert("questions", row);
        return Response.json({ ok: true }, { headers: CORS_HEADERS });
      }

      case "load_reports": {
        const data = await sbSelect(
          "questions",
          "select=id,subject,idx,topic,q,o,c,e,report_count&report_count=gt.0&order=report_count.desc&limit=50"
        );
        return Response.json({ data }, { headers: CORS_HEADERS });
      }

      case "get_reports": {
        const { question_id } = body;
        if (!question_id) return Response.json({ error: "Missing question_id" }, { status: 400, headers: CORS_HEADERS });
        const data = await sbSelect(
          "question_reports",
          `select=id,reason,comment,created_at,user_id&question_id=eq.${question_id}&order=created_at.desc`
        );
        return Response.json({ data }, { headers: CORS_HEADERS });
      }

      case "activate_premium": {
        const { email, plan: premiumPlan } = body;
        if (!email) return Response.json({ error: "Missing email" }, { status: 400, headers: CORS_HEADERS });
        if (!['monthly', 'yearly'].includes(premiumPlan)) return Response.json({ error: "Invalid plan" }, { status: 400, headers: CORS_HEADERS });

        const targetUser = await findUserByEmail(email);
        if (!targetUser) return Response.json({ error: `User not found: ${email}` }, { status: 404, headers: CORS_HEADERS });

        const premiumUntil = await activatePremium({
          userId: targetUser.id,
          userMeta: targetUser.user_metadata,
          plan: premiumPlan,
          kaspiTxId: "manual",
        });

        return Response.json({ ok: true, premium_until: premiumUntil }, { headers: CORS_HEADERS });
      }

      default:
        return Response.json({ error: `Unknown action: ${action}` }, { status: 400, headers: CORS_HEADERS });
    }
  } catch (err) {
    console.error("Admin action error:", err);
    return Response.json({ error: err.message || "Server error" }, { status: 500, headers: CORS_HEADERS });
  }
}
