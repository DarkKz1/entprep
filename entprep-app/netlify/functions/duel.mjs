// Duel API: create, join, submit answers, forfeit
// Real-time 1v1 duels — action-based routing (same pattern as social.mjs)

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
    headers: sbHeaders,
    body: JSON.stringify(row),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function sbUpdate(table, filter, data) {
  const res = await fetch(`${SB_URL}/rest/v1/${table}?${filter}`, {
    method: "PATCH",
    headers: sbHeaders,
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// Rate limiters
const createLimit = createRateLimiter("duel_create", { max: 5, windowSec: 60 });
const joinLimit = createRateLimiter("duel_join", { max: 10, windowSec: 60 });
const answerLimit = createRateLimiter("duel_answer", { max: 60, windowSec: 60 });
const generalLimit = createRateLimiter("duel_general", { max: 30, windowSec: 60 });

// Fisher-Yates shuffle
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Generate 6-char uppercase alphanumeric code
function genCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I to avoid confusion
  let code = "";
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

// Strip correct answers from questions before sending to client
function stripQuestions(questions) {
  return questions.map(q => ({
    idx: q.idx,
    q: q.q,
    o: q.o,
    _topic: q.topic || null,
  }));
}

export default async function handler(req) {
  if (req.method === "OPTIONS") return corsResponse();
  if (req.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405, headers: CORS_HEADERS });
  }

  if (!SB_URL || !SB_KEY) {
    return Response.json({ error: "Server misconfigured" }, { status: 500, headers: CORS_HEADERS });
  }

  const user = await verifyAuth(req);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401, headers: CORS_HEADERS });

  let body;
  try { body = await req.json(); } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400, headers: CORS_HEADERS });
  }

  const { action } = body;

  try {
    switch (action) {

      // ── Create a new duel ─────────────────────────────────────────────
      case "create_duel": {
        const rl = createLimit(user.id);
        if (rl) return rateLimitResponse(rl);

        const { subject } = body;
        if (!subject || typeof subject !== "string") {
          return Response.json({ error: "Missing subject" }, { status: 400, headers: CORS_HEADERS });
        }

        // Pick 10 random single-choice questions from subject
        // Filter at DB level: no passages, single-choice only
        const pool = await sbGet(
          "questions",
          `select=idx,q,o,c,topic,type,passage_group,passage_title&subject=eq.${encodeURIComponent(subject)}&passage_group=is.null&passage_title=is.null&limit=500`
        );
        // Keep only single-choice with valid options, double-check no passage refs in text
        const passageRe = /(?:according to|based on|in the (?:text|passage)|прочитайте|на основе текста|по тексту|из текста)/i;
        const singles = pool.filter(q =>
          (!q.type || q.type === "single") &&
          Array.isArray(q.o) && q.o.length >= 2 &&
          typeof q.c === "number" &&
          !passageRe.test(q.q)
        );
        if (singles.length < 10) {
          return Response.json({ error: "Недостаточно вопросов для этого предмета" }, { status: 400, headers: CORS_HEADERS });
        }
        const questions = shuffle(singles).slice(0, 10);

        // Generate unique code
        let code;
        for (let attempt = 0; attempt < 5; attempt++) {
          code = genCode();
          const existing = await sbGet("duels", `select=id&code=eq.${code}&status=eq.waiting&limit=1`);
          if (existing.length === 0) break;
          if (attempt === 4) throw new Error("Failed to generate unique code");
        }

        const questionIds = questions.map(q => q.idx);
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 min

        const [duel] = await sbInsert("duels", {
          code,
          subject,
          creator_id: user.id,
          question_ids: questionIds,
          expires_at: expiresAt,
        });

        // Get creator profile
        const profiles = await sbGet("profiles", `select=id,nickname,display_name,avatar_url,level&id=eq.${user.id}&limit=1`);

        return Response.json({
          duel_id: duel.id,
          code: duel.code,
          questions: stripQuestions(questions),
          creator_profile: profiles[0] || null,
        }, { headers: CORS_HEADERS });
      }

      // ── Join a duel by code ───────────────────────────────────────────
      case "join_duel": {
        const rl = joinLimit(user.id);
        if (rl) return rateLimitResponse(rl);

        const { code } = body;
        if (!code || typeof code !== "string" || code.length !== 6) {
          return Response.json({ error: "Invalid code" }, { status: 400, headers: CORS_HEADERS });
        }

        // Find waiting duel
        const duels = await sbGet("duels", `select=*&code=eq.${code.toUpperCase()}&status=eq.waiting&limit=1`);
        if (duels.length === 0) {
          return Response.json({ error: "Дуэль не найдена или уже началась" }, { status: 404, headers: CORS_HEADERS });
        }
        const duel = duels[0];

        if (duel.creator_id === user.id) {
          return Response.json({ error: "Нельзя присоединиться к своей дуэли" }, { status: 400, headers: CORS_HEADERS });
        }

        // Check expiry
        if (new Date(duel.expires_at) < new Date()) {
          await sbUpdate("duels", `id=eq.${duel.id}`, { status: "expired" });
          return Response.json({ error: "Дуэль истекла" }, { status: 410, headers: CORS_HEADERS });
        }

        // Update duel: set opponent, status=active, started_at
        await sbUpdate("duels", `id=eq.${duel.id}`, {
          opponent_id: user.id,
          status: "active",
          started_at: new Date().toISOString(),
        });

        // Fetch the exact same questions creator got (by stored IDs)
        const qIds = Array.isArray(duel.question_ids) ? duel.question_ids : [];
        if (qIds.length === 0) {
          return Response.json({ error: "Дуэль повреждена: нет вопросов" }, { status: 500, headers: CORS_HEADERS });
        }
        console.log("join_duel: fetching questions", { duel_id: duel.id, subject: duel.subject, qIds });
        const questions = await sbGet(
          "questions",
          `select=idx,q,o,c,topic&subject=eq.${encodeURIComponent(duel.subject)}&idx=in.(${qIds.join(",")})&limit=${qIds.length}`
        );
        // Sort to match creator's original order
        const qMap = new Map(questions.map(q => [q.idx, q]));
        const ordered = qIds.map(idx => qMap.get(idx)).filter(Boolean);
        console.log("join_duel: got", ordered.length, "of", qIds.length, "questions");

        // Fetch both profiles
        const profiles = await sbGet(
          "profiles",
          `select=id,nickname,display_name,avatar_url,level&id=in.(${duel.creator_id},${user.id})`
        );
        const profileMap = Object.fromEntries(profiles.map(p => [p.id, p]));

        return Response.json({
          duel_id: duel.id,
          subject: duel.subject,
          questions: stripQuestions(ordered),
          creator_profile: profileMap[duel.creator_id] || null,
          opponent_profile: profileMap[user.id] || null,
        }, { headers: CORS_HEADERS });
      }

      // ── Submit answer for a question ──────────────────────────────────
      case "submit_answer": {
        const rl = answerLimit(user.id);
        if (rl) return rateLimitResponse(rl);

        const { duel_id, question_index, answer } = body;
        if (typeof duel_id !== "number" || typeof question_index !== "number") {
          return Response.json({ error: "Invalid params" }, { status: 400, headers: CORS_HEADERS });
        }
        // answer can be number (selected option) or null (timeout)

        // Get duel
        const duels = await sbGet("duels", `select=*&id=eq.${duel_id}&limit=1`);
        if (duels.length === 0) return Response.json({ error: "Duel not found" }, { status: 404, headers: CORS_HEADERS });
        const duel = duels[0];

        if (duel.status !== "active") {
          return Response.json({ error: "Duel not active" }, { status: 400, headers: CORS_HEADERS });
        }

        const isCreator = duel.creator_id === user.id;
        const isOpponent = duel.opponent_id === user.id;
        if (!isCreator && !isOpponent) {
          return Response.json({ error: "Not your duel" }, { status: 403, headers: CORS_HEADERS });
        }

        // Validate question index
        if (question_index < 0 || question_index >= duel.question_ids.length) {
          return Response.json({ error: "Invalid question index" }, { status: 400, headers: CORS_HEADERS });
        }

        // Check if already answered
        const answersField = isCreator ? "creator_answers" : "opponent_answers";
        const currentAnswers = duel[answersField] || {};
        if (currentAnswers[String(question_index)] !== undefined) {
          return Response.json({ error: "Already answered" }, { status: 409, headers: CORS_HEADERS });
        }

        // Get the actual question to score (filter by subject to ensure correct match)
        const qIdx = duel.question_ids[question_index];
        const questions = await sbGet("questions", `select=idx,c&subject=eq.${encodeURIComponent(duel.subject)}&idx=eq.${qIdx}&limit=1`);
        if (questions.length === 0) {
          return Response.json({ error: "Question not found" }, { status: 500, headers: CORS_HEADERS });
        }
        const correctAnswer = questions[0].c;
        const correct = answer !== null && answer === correctAnswer;

        // Update answers and score
        const newAnswers = { ...currentAnswers, [String(question_index)]: answer };
        const scoreField = isCreator ? "creator_score" : "opponent_score";
        const doneField = isCreator ? "creator_done" : "opponent_done";
        const newScore = duel[scoreField] + (correct ? 1 : 0);
        const isDone = Object.keys(newAnswers).length >= duel.question_ids.length;

        const update = {
          [answersField]: newAnswers,
          [scoreField]: newScore,
        };
        if (isDone) update[doneField] = true;

        // Check if both done
        const otherDone = isCreator ? duel.opponent_done : duel.creator_done;
        if (isDone && otherDone) {
          update.status = "finished";
          update.finished_at = new Date().toISOString();
        }

        await sbUpdate("duels", `id=eq.${duel.id}`, update);

        return Response.json({
          correct,
          correct_answer: correctAnswer,
          your_score: newScore,
          done: isDone,
        }, { headers: CORS_HEADERS });
      }

      // ── Get duel state (for reconnection) ─────────────────────────────
      case "get_duel": {
        const rl = generalLimit(user.id);
        if (rl) return rateLimitResponse(rl);

        const { duel_id } = body;
        if (typeof duel_id !== "number") {
          return Response.json({ error: "Missing duel_id" }, { status: 400, headers: CORS_HEADERS });
        }

        const duels = await sbGet("duels", `select=*&id=eq.${duel_id}&limit=1`);
        if (duels.length === 0) return Response.json({ error: "Not found" }, { status: 404, headers: CORS_HEADERS });
        const duel = duels[0];

        if (duel.creator_id !== user.id && duel.opponent_id !== user.id) {
          return Response.json({ error: "Not your duel" }, { status: 403, headers: CORS_HEADERS });
        }

        // Fetch questions (stripped, filter by subject for correct match)
        const qIds = duel.question_ids;
        const questions = await sbGet(
          "questions",
          `select=idx,q,o,topic&subject=eq.${encodeURIComponent(duel.subject)}&idx=in.(${qIds.join(",")})&limit=${qIds.length}`
        );
        const qMap = new Map(questions.map(q => [q.idx, q]));
        const ordered = qIds.map(idx => qMap.get(idx)).filter(Boolean);

        // Fetch profiles
        const pIds = [duel.creator_id, duel.opponent_id].filter(Boolean);
        const profiles = await sbGet(
          "profiles",
          `select=id,nickname,display_name,avatar_url,level&id=in.(${pIds.join(",")})`
        );
        const profileMap = Object.fromEntries(profiles.map(p => [p.id, p]));

        return Response.json({
          duel,
          questions: stripQuestions(ordered),
          creator_profile: profileMap[duel.creator_id] || null,
          opponent_profile: duel.opponent_id ? profileMap[duel.opponent_id] || null : null,
        }, { headers: CORS_HEADERS });
      }

      // ── Forfeit duel ──────────────────────────────────────────────────
      case "forfeit": {
        const rl = generalLimit(user.id);
        if (rl) return rateLimitResponse(rl);

        const { duel_id } = body;
        if (typeof duel_id !== "number") {
          return Response.json({ error: "Missing duel_id" }, { status: 400, headers: CORS_HEADERS });
        }

        const duels = await sbGet("duels", `select=*&id=eq.${duel_id}&limit=1`);
        if (duels.length === 0) return Response.json({ error: "Not found" }, { status: 404, headers: CORS_HEADERS });
        const duel = duels[0];

        if (duel.creator_id !== user.id && duel.opponent_id !== user.id) {
          return Response.json({ error: "Not your duel" }, { status: 403, headers: CORS_HEADERS });
        }
        if (duel.status !== "waiting" && duel.status !== "active") {
          return Response.json({ error: "Duel already ended" }, { status: 400, headers: CORS_HEADERS });
        }

        await sbUpdate("duels", `id=eq.${duel.id}`, {
          status: "forfeit",
          finished_at: new Date().toISOString(),
        });

        return Response.json({ ok: true }, { headers: CORS_HEADERS });
      }

      default:
        return Response.json({ error: `Unknown action: ${action}` }, { status: 400, headers: CORS_HEADERS });
    }
  } catch (err) {
    console.error("Duel action error:", action, err);
    return Response.json({ error: err.message || "Server error" }, { status: 500, headers: CORS_HEADERS });
  }
}

export const config = { path: "/api/duel" };
