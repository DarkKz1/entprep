// Social API: friends, nicknames, profile search
// Single function with action-based routing (same pattern as admin-action.mjs)
// Uses Supabase REST API with service key (bypasses RLS)

import { CORS_HEADERS, corsResponse, verifyAuth, createRateLimiter, rateLimitResponse } from "./utils/shared.mjs";

const SB_URL = process.env.VITE_SUPABASE_URL;
const SB_KEY = process.env.SUPABASE_SERVICE_KEY;

const sbHeaders = {
  apikey: SB_KEY,
  Authorization: `Bearer ${SB_KEY}`,
  "Content-Type": "application/json",
  Prefer: "return=representation",
};

async function sbGet(table, query) {
  const res = await fetch(`${SB_URL}/rest/v1/${table}?${query}`, { headers: sbHeaders });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function sbInsert(table, row) {
  const res = await fetch(`${SB_URL}/rest/v1/${table}`, {
    method: "POST",
    headers: { ...sbHeaders, Prefer: "return=representation" },
    body: JSON.stringify(row),
  });
  if (!res.ok) {
    const text = await res.text();
    // Return specific error for unique violations
    if (res.status === 409 || text.includes("duplicate") || text.includes("unique")) {
      throw Object.assign(new Error("duplicate"), { status: 409 });
    }
    throw new Error(text);
  }
  return res.json();
}

async function sbUpdate(table, filter, data) {
  const res = await fetch(`${SB_URL}/rest/v1/${table}?${filter}`, {
    method: "PATCH",
    headers: { ...sbHeaders, Prefer: "return=representation" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function sbDelete(table, filter) {
  const res = await fetch(`${SB_URL}/rest/v1/${table}?${filter}`, {
    method: "DELETE",
    headers: { ...sbHeaders, Prefer: "return=minimal" },
  });
  if (!res.ok) throw new Error(await res.text());
}

// Rate limiters per action
const searchLimit = createRateLimiter("social_search", { max: 30, windowSec: 60 });
const nicknameLimit = createRateLimiter("social_nickname", { max: 5, windowSec: 60 });
const friendReqLimit = createRateLimiter("social_friend_req", { max: 10, windowSec: 3600 });
const generalLimit = createRateLimiter("social_general", { max: 20, windowSec: 60 });

// Nickname validation
const NICKNAME_RE = /^[a-zA-Z0-9_]{3,20}$/;

export default async function handler(req) {
  if (req.method === "OPTIONS") return corsResponse();
  if (req.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405, headers: CORS_HEADERS });
  }

  if (!SB_URL || !SB_KEY) {
    return Response.json({ error: "Server misconfigured" }, { status: 500, headers: CORS_HEADERS });
  }

  // Auth required for all social actions
  const user = await verifyAuth(req);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401, headers: CORS_HEADERS });

  let body;
  try { body = await req.json(); } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400, headers: CORS_HEADERS });
  }

  const { action } = body;

  try {
    switch (action) {

      // ── Search users by nickname prefix ───────────────────────────────
      case "search_users": {
        const rl = searchLimit(user.id);
        if (rl) return rateLimitResponse(rl);

        const { query } = body;
        if (!query || typeof query !== "string" || query.length < 2 || query.length > 30) {
          return Response.json({ error: "Query must be 2-30 chars" }, { status: 400, headers: CORS_HEADERS });
        }
        // ILIKE search on nickname, exclude self
        const data = await sbGet(
          "profiles",
          `select=id,nickname,display_name,avatar_url,level,xp,streak&nickname=ilike.${encodeURIComponent(query)}*&id=neq.${user.id}&limit=10&order=nickname.asc`
        );
        return Response.json({ users: data }, { headers: CORS_HEADERS });
      }

      // ── Set or update nickname ────────────────────────────────────────
      case "set_nickname": {
        const rl = nicknameLimit(user.id);
        if (rl) return rateLimitResponse(rl);

        const { nickname } = body;
        if (!nickname || !NICKNAME_RE.test(nickname)) {
          return Response.json({ error: "Никнейм: 3-20 символов, только буквы, цифры и _" }, { status: 400, headers: CORS_HEADERS });
        }
        // Check uniqueness (case-insensitive)
        const existing = await sbGet("profiles", `select=id&nickname=ilike.${encodeURIComponent(nickname)}&id=neq.${user.id}&limit=1`);
        if (existing.length > 0) {
          return Response.json({ error: "Этот никнейм уже занят" }, { status: 409, headers: CORS_HEADERS });
        }
        await sbUpdate("profiles", `id=eq.${user.id}`, { nickname });
        return Response.json({ ok: true }, { headers: CORS_HEADERS });
      }

      // ── Send friend request ───────────────────────────────────────────
      case "send_friend_request": {
        const rl = friendReqLimit(user.id);
        if (rl) return rateLimitResponse(rl);

        const { friend_id } = body;
        if (!friend_id || friend_id === user.id) {
          return Response.json({ error: "Invalid friend_id" }, { status: 400, headers: CORS_HEADERS });
        }
        // Check target user exists
        const target = await sbGet("profiles", `select=id&id=eq.${friend_id}&limit=1`);
        if (target.length === 0) {
          return Response.json({ error: "Пользователь не найден" }, { status: 404, headers: CORS_HEADERS });
        }
        // Check not already friends (either direction)
        const existing = await sbGet(
          "friendships",
          `select=id,status&or=(and(user_id.eq.${user.id},friend_id.eq.${friend_id}),and(user_id.eq.${friend_id},friend_id.eq.${user.id}))&limit=1`
        );
        if (existing.length > 0) {
          const st = existing[0].status;
          if (st === "accepted") return Response.json({ error: "Вы уже друзья" }, { status: 409, headers: CORS_HEADERS });
          if (st === "pending") return Response.json({ error: "Запрос уже отправлен" }, { status: 409, headers: CORS_HEADERS });
        }
        try {
          await sbInsert("friendships", { user_id: user.id, friend_id });
        } catch (err) {
          if (err.status === 409) return Response.json({ error: "Запрос уже отправлен" }, { status: 409, headers: CORS_HEADERS });
          throw err;
        }
        return Response.json({ ok: true }, { headers: CORS_HEADERS });
      }

      // ── Respond to friend request (accept/decline) ────────────────────
      case "respond_friend_request": {
        const rl = generalLimit(user.id);
        if (rl) return rateLimitResponse(rl);

        const { friendship_id, response } = body;
        if (!friendship_id || !["accepted", "declined"].includes(response)) {
          return Response.json({ error: "Invalid params" }, { status: 400, headers: CORS_HEADERS });
        }
        // Verify this user is the recipient
        const rows = await sbGet("friendships", `select=id,friend_id,status&id=eq.${friendship_id}&limit=1`);
        if (rows.length === 0) return Response.json({ error: "Not found" }, { status: 404, headers: CORS_HEADERS });
        if (rows[0].friend_id !== user.id) return Response.json({ error: "Forbidden" }, { status: 403, headers: CORS_HEADERS });
        if (rows[0].status !== "pending") return Response.json({ error: "Already responded" }, { status: 409, headers: CORS_HEADERS });

        await sbUpdate("friendships", `id=eq.${friendship_id}`, { status: response });
        return Response.json({ ok: true }, { headers: CORS_HEADERS });
      }

      // ── Remove friend ─────────────────────────────────────────────────
      case "remove_friend": {
        const rl = generalLimit(user.id);
        if (rl) return rateLimitResponse(rl);

        const { friendship_id } = body;
        if (!friendship_id) return Response.json({ error: "Missing friendship_id" }, { status: 400, headers: CORS_HEADERS });

        // Verify this user is one of the parties
        const rows = await sbGet("friendships", `select=id,user_id,friend_id&id=eq.${friendship_id}&limit=1`);
        if (rows.length === 0) return Response.json({ error: "Not found" }, { status: 404, headers: CORS_HEADERS });
        if (rows[0].user_id !== user.id && rows[0].friend_id !== user.id) {
          return Response.json({ error: "Forbidden" }, { status: 403, headers: CORS_HEADERS });
        }
        await sbDelete("friendships", `id=eq.${friendship_id}`);
        return Response.json({ ok: true }, { headers: CORS_HEADERS });
      }

      // ── List accepted friends with profile data ───────────────────────
      case "list_friends": {
        const rl = generalLimit(user.id);
        if (rl) return rateLimitResponse(rl);

        // Get all accepted friendships where user is either party
        const friendships = await sbGet(
          "friendships",
          `select=id,user_id,friend_id,created_at&status=eq.accepted&or=(user_id.eq.${user.id},friend_id.eq.${user.id})&order=created_at.desc`
        );
        if (friendships.length === 0) return Response.json({ friends: [] }, { headers: CORS_HEADERS });

        // Collect the OTHER user's IDs
        const friendIds = friendships.map(f => f.user_id === user.id ? f.friend_id : f.user_id);
        const uniqueIds = [...new Set(friendIds)];

        // Fetch their profiles
        const profiles = await sbGet(
          "profiles",
          `select=id,nickname,display_name,avatar_url,level,xp,streak,last_active&id=in.(${uniqueIds.join(",")})`
        );
        const profileMap = Object.fromEntries(profiles.map(p => [p.id, p]));

        const friends = friendships.map(f => {
          const otherId = f.user_id === user.id ? f.friend_id : f.user_id;
          return { ...f, status: "accepted", profile: profileMap[otherId] || null };
        }).filter(f => f.profile);

        return Response.json({ friends }, { headers: CORS_HEADERS });
      }

      // ── List pending incoming requests ─────────────────────────────────
      case "list_requests": {
        const rl = generalLimit(user.id);
        if (rl) return rateLimitResponse(rl);

        const requests = await sbGet(
          "friendships",
          `select=id,user_id,created_at&status=eq.pending&friend_id=eq.${user.id}&order=created_at.desc`
        );
        if (requests.length === 0) return Response.json({ requests: [] }, { headers: CORS_HEADERS });

        // Fetch requester profiles
        const senderIds = requests.map(r => r.user_id);
        const profiles = await sbGet(
          "profiles",
          `select=id,nickname,display_name,avatar_url,level,xp,streak&id=in.(${senderIds.join(",")})`
        );
        const profileMap = Object.fromEntries(profiles.map(p => [p.id, p]));

        const result = requests.map(r => ({
          ...r,
          status: "pending",
          profile: profileMap[r.user_id] || null,
        })).filter(r => r.profile);

        return Response.json({ requests: result }, { headers: CORS_HEADERS });
      }

      // ── Get friend IDs only (for leaderboard filtering) ───────────────
      case "get_friend_ids": {
        const rl = searchLimit(user.id);
        if (rl) return rateLimitResponse(rl);

        const friendships = await sbGet(
          "friendships",
          `select=user_id,friend_id&status=eq.accepted&or=(user_id.eq.${user.id},friend_id.eq.${user.id})`
        );
        const ids = friendships.map(f => f.user_id === user.id ? f.friend_id : f.user_id);
        // Include self so user sees their own scores too
        return Response.json({ ids: [user.id, ...new Set(ids)] }, { headers: CORS_HEADERS });
      }

      // ── Get or ensure own profile ─────────────────────────────────────
      case "get_profile": {
        const rl = generalLimit(user.id);
        if (rl) return rateLimitResponse(rl);

        let rows = await sbGet("profiles", `select=*&id=eq.${user.id}&limit=1`);

        // Auto-create profile if it doesn't exist (for users created before migration)
        if (rows.length === 0) {
          const displayName = user.user_metadata?.full_name || user.email || "User";
          const avatarUrl = user.user_metadata?.avatar_url || null;
          const nickname = "user_" + user.id.slice(0, 8);
          rows = await sbInsert("profiles", {
            id: user.id, nickname, display_name: displayName, avatar_url: avatarUrl,
          });
          if (!Array.isArray(rows)) rows = [rows];
        }

        return Response.json({ profile: rows[0] }, { headers: CORS_HEADERS });
      }

      // ── Resolve nickname to profile (for ?add= invite links) ──────────
      case "resolve_nickname": {
        const rl = searchLimit(user.id);
        if (rl) return rateLimitResponse(rl);

        const { nickname } = body;
        if (!nickname || typeof nickname !== "string") {
          return Response.json({ error: "Missing nickname" }, { status: 400, headers: CORS_HEADERS });
        }
        const rows = await sbGet(
          "profiles",
          `select=id,nickname,display_name,avatar_url,level,xp,streak&nickname=ilike.${encodeURIComponent(nickname)}&limit=1`
        );
        if (rows.length === 0) return Response.json({ error: "Пользователь не найден" }, { status: 404, headers: CORS_HEADERS });
        return Response.json({ profile: rows[0] }, { headers: CORS_HEADERS });
      }

      default:
        return Response.json({ error: `Unknown action: ${action}` }, { status: 400, headers: CORS_HEADERS });
    }
  } catch (err) {
    console.error("Social action error:", action, err);
    return Response.json({ error: err.message || "Server error" }, { status: 500, headers: CORS_HEADERS });
  }
}

export const config = { path: "/api/social" };
