// Leaderboard: submit scores + fetch rankings
// Uses service key to bypass RLS

import { CORS_HEADERS, corsResponse, verifyAuth } from "./utils/shared.mjs";

function getSbConfig() {
  return {
    url: process.env.VITE_SUPABASE_URL,
    key: process.env.SUPABASE_SERVICE_KEY,
  };
}

export default async function handler(req) {
  if (req.method === "OPTIONS") return corsResponse();

  const { url: SB_URL, key: SB_KEY } = getSbConfig();
  if (!SB_URL || !SB_KEY) {
    console.error("Missing env vars:", { SB_URL: !!SB_URL, SB_KEY: !!SB_KEY });
    return Response.json({ error: "Server misconfigured" }, { status: 500, headers: CORS_HEADERS });
  }

  const authHeaders = { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` };

  // GET = fetch scores
  if (req.method === "GET") {
    const u = new URL(req.url, `https://${req.headers.get("host") || "localhost"}`);
    const period = u.searchParams.get("period") || "all";
    const subject = u.searchParams.get("subject") || "all";

    let query = "select=id,user_id,user_name,subject,score,created_at&order=created_at.desc&limit=500";

    if (period !== "all") {
      const d = new Date();
      if (period === "week") d.setDate(d.getDate() - 7);
      else d.setMonth(d.getMonth() - 1);
      query += `&created_at=gte.${d.toISOString()}`;
    }
    if (subject !== "all") {
      query += `&subject=eq.${subject}`;
    }

    // Filter by specific user IDs (for friends/group leaderboard tabs)
    const userIds = u.searchParams.get("user_ids");
    if (userIds) {
      const ids = userIds.split(",").filter(id => /^[a-f0-9-]{36}$/.test(id)).slice(0, 100);
      if (ids.length > 0) {
        query += `&user_id=in.(${ids.join(",")})`;
      }
    }

    try {
      const res = await fetch(`${SB_URL}/rest/v1/leaderboard?${query}`, { headers: authHeaders });
      if (!res.ok) {
        const text = await res.text();
        console.error("LB GET error:", res.status, text);
        return Response.json({ error: "DB error" }, { status: 500, headers: CORS_HEADERS });
      }
      const data = await res.json();

      // Enrich with nicknames from profiles table
      const uids = [...new Set(data.map(r => r.user_id))];
      if (uids.length > 0) {
        try {
          const pRes = await fetch(
            `${SB_URL}/rest/v1/profiles?id=in.(${uids.join(",")})&select=id,nickname,avatar_url`,
            { headers: authHeaders }
          );
          if (pRes.ok) {
            const profiles = await pRes.json();
            const pm = new Map(profiles.map(p => [p.id, p]));
            for (const row of data) {
              const p = pm.get(row.user_id);
              if (p) {
                row.nickname = p.nickname;
                row.avatar_url = p.avatar_url;
              }
            }
          }
        } catch (e) {
          console.warn("Failed to enrich leaderboard with profiles:", e.message);
        }
      }

      return Response.json(data, { headers: CORS_HEADERS });
    } catch (err) {
      console.error("LB GET fetch error:", err);
      return Response.json({ error: err.message }, { status: 500, headers: CORS_HEADERS });
    }
  }

  // POST = submit score
  if (req.method === "POST") {
    const user = await verifyAuth(req);
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401, headers: CORS_HEADERS });

    let body;
    try { body = await req.json(); } catch {
      return Response.json({ error: "Invalid JSON" }, { status: 400, headers: CORS_HEADERS });
    }

    const { subject, score } = body;
    if (!subject || typeof score !== "number" || score < 0 || score > 100) {
      return Response.json({ error: "Invalid data" }, { status: 400, headers: CORS_HEADERS });
    }

    // Prefer nickname from profiles, fall back to Google name
    let userName = user.user_metadata?.full_name || user.email || "Anonymous";
    try {
      const pRes = await fetch(
        `${SB_URL}/rest/v1/profiles?id=eq.${user.id}&select=nickname`,
        { headers: authHeaders }
      );
      if (pRes.ok) {
        const [profile] = await pRes.json();
        if (profile?.nickname && !profile.nickname.startsWith("user_")) userName = profile.nickname;
      }
    } catch {}

    try {
      const res = await fetch(`${SB_URL}/rest/v1/leaderboard`, {
        method: "POST",
        headers: { ...authHeaders, "Content-Type": "application/json", Prefer: "return=minimal" },
        body: JSON.stringify({ subject, user_name: userName, score, user_id: user.id }),
      });
      if (!res.ok) {
        const text = await res.text();
        console.error("LB POST error:", res.status, text);
        return Response.json({ error: "Failed to save" }, { status: 500, headers: CORS_HEADERS });
      }
      return Response.json({ ok: true }, { headers: CORS_HEADERS });
    } catch (err) {
      console.error("LB POST error:", err);
      return Response.json({ error: "Failed to save" }, { status: 500, headers: CORS_HEADERS });
    }
  }

  return Response.json({ error: "Method not allowed" }, { status: 405, headers: CORS_HEADERS });
}
