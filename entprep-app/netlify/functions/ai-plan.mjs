import { corsResponse, CORS_HEADERS, verifyAuth, createRateLimiter, rateLimitResponse, validatePlan } from "./utils/shared.mjs";
import { AI_MODEL, ANTHROPIC_API_URL } from "./utils/constants.mjs";

const checkRate = createRateLimiter("plan", { max: 5, windowSec: 60 });

export default async function handler(req) {
  if (req.method === "OPTIONS") return corsResponse();
  if (req.method !== "POST") return Response.json({ error: "Method not allowed" }, { status: 405, headers: CORS_HEADERS });

  // Auth
  const user = await verifyAuth(req);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401, headers: CORS_HEADERS });

  // Premium check
  const adminEmails = (process.env.ADMIN_EMAILS || "").split(",").map(e => e.trim());
  const isAdmin = adminEmails.includes(user.email);
  const isPremium = isAdmin || (user.user_metadata?.is_premium && new Date(user.user_metadata.premium_until) > new Date());
  if (!isPremium) return Response.json({ error: "Premium required" }, { status: 403, headers: CORS_HEADERS });

  // Rate limit
  const retryAfter = checkRate(user.id);
  if (retryAfter) return rateLimitResponse(retryAfter);

  // Parse + validate
  let body;
  try { body = await req.json(); } catch { return Response.json({ error: "Invalid JSON" }, { status: 400, headers: CORS_HEADERS }); }

  const err = validatePlan(body);
  if (err) return Response.json({ error: err }, { status: 400, headers: CORS_HEADERS });

  const { weak, strong, overall, totalTests, streak, lang } = body;

  // Anthropic API key
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return Response.json({ error: "AI not configured" }, { status: 500, headers: CORS_HEADERS });

  const weakText = (weak || []).map(s => {
    let line = `${s.name}: средний ${s.avg}%, тренд ${s.trend === "declining" ? "падает" : s.trend === "improving" ? "растёт" : "стабильно"}`;
    if (s.topics && s.topics.length > 0) {
      line += ". Темы: " + s.topics.map(t => `${t.name} (${t.pct}%)`).join(", ");
    }
    return line;
  }).join("\n");

  const strongText = (strong || []).map(s => `${s.name}: ${s.avg}%`).join(", ");

  const isKk = lang === 'kk';
  const systemPrompt = isKk
    ? `Сен ҰБТ (Ұлттық бірыңғай тестілеу, Қазақстан) репетиторысың. Жеке 7 күндік дайындық жоспарын қазақ тілінде құр.

Markdown-сыз қатаң JSON қайтар:
{
  "summary": "1-2 сөйлем — негізгі мәселелер мен стратегия",
  "days": [
    {
      "day": 1,
      "title": "Дүйсенбі — Күннің негізгі тақырыбы",
      "tasks": [
        {"type":"test","subject":"subject_id","topic":"topic_id","text":"Тапсырма сипаттамасы"},
        {"type":"review","text":"Нені қайталау керек"},
        {"type":"tip","text":"Күннің кеңесі"}
      ]
    }
  ]
}

Ережелер:
- Әлсіз пәндер мен тақырыптарға баса назар аудар, бірақ күштілерді де қос
- Күн сайын: 2-4 тапсырма (тест, қайталау, кеңес)
- type "test" — әрқашан subject (пән ID) және topic (белгілі болса) көрсет
- type "review" және "tip" — subject-сіз
- Кеңестер нақты және пайдалы болсын
- Пәндерді кезектестір, қиындарды қатарынан қойма
- Демалыс күндері — жеңілірек, қайталау`
    : `Ты репетитор ЕНТ (Единое национальное тестирование, Казахстан). Составь персональный 7-дневный план подготовки на русском языке.

Верни строго JSON без markdown:
{
  "summary": "1-2 предложения — основные проблемы и стратегия",
  "days": [
    {
      "day": 1,
      "title": "Понедельник — Основная тема дня",
      "tasks": [
        {"type":"test","subject":"subject_id","topic":"topic_id","text":"Описание задания"},
        {"type":"review","text":"Что повторить"},
        {"type":"tip","text":"Совет дня"}
      ]
    }
  ]
}

Правила:
- Делай упор на слабые предметы и темы, но включай и сильные для поддержки
- Каждый день: 2-4 задания (тест, повторение, совет)
- type "test" — всегда указывай subject (ID предмета) и topic (если известна)
- type "review" и "tip" — без subject
- Советы должны быть конкретными и полезными
- Чередуй предметы, не ставь сложные подряд
- В выходные — легче, повторение`;

  const userMessage = `Данные ученика:
Общий средний балл: ${overall}%
Всего тестов: ${totalTests}
Серия дней: ${streak || 0}

Слабые предметы:
${weakText || "нет данных"}

Сильные предметы: ${strongText || "нет данных"}`;

  try {
    const aiRes = await fetch(ANTHROPIC_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: AI_MODEL,
        max_tokens: 1200,
        temperature: 0.7,
        system: systemPrompt,
        messages: [{ role: "user", content: userMessage }],
      }),
    });

    if (!aiRes.ok) {
      console.error("Anthropic error:", await aiRes.text());
      return Response.json({ error: "AI временно недоступен. Попробуйте позже." }, { status: 500, headers: CORS_HEADERS });
    }

    const data = await aiRes.json();
    let raw = data.content?.[0]?.text?.trim() || "";
    raw = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();

    try {
      const parsed = JSON.parse(raw);
      if (!parsed.summary || !Array.isArray(parsed.days)) {
        return Response.json({ error: "Invalid plan format" }, { status: 500, headers: CORS_HEADERS });
      }
      return Response.json(parsed, { headers: CORS_HEADERS });
    } catch {
      console.error("Failed to parse plan JSON:", raw);
      return Response.json({ error: "Не удалось сформировать план. Попробуйте ещё раз." }, { status: 500, headers: CORS_HEADERS });
    }
  } catch (fetchErr) {
    console.error("Anthropic fetch error:", fetchErr);
    return Response.json({ error: "AI service unavailable" }, { status: 500, headers: CORS_HEADERS });
  }
}

export const config = { path: "/api/ai-plan" };
