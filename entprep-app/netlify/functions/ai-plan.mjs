export default async function handler(req) {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
      },
    });
  }

  if (req.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  // Verify Supabase JWT
  const authHeader = req.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = authHeader.slice(7);
  const supabaseUrl = process.env.VITE_SUPABASE_URL;

  try {
    const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: process.env.VITE_SUPABASE_ANON_KEY,
      },
    });

    if (!userRes.ok) {
      return Response.json({ error: "Invalid token" }, { status: 401 });
    }
  } catch {
    return Response.json({ error: "Auth check failed" }, { status: 401 });
  }

  // Parse request body
  let body;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { weak, strong, overall, totalTests, streak } = body;

  if (!weak || overall === undefined || totalTests === undefined) {
    return Response.json({ error: "Missing fields" }, { status: 400 });
  }

  // Call OpenAI
  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) {
    return Response.json({ error: "AI not configured" }, { status: 500 });
  }

  const weakText = (weak || []).map(s => {
    let line = `${s.name}: средний ${s.avg}%, тренд ${s.trend === "declining" ? "падает" : s.trend === "improving" ? "растёт" : "стабильно"}`;
    if (s.topics && s.topics.length > 0) {
      line += ". Темы: " + s.topics.map(t => `${t.name} (${t.pct}%)`).join(", ");
    }
    return line;
  }).join("\n");

  const strongText = (strong || []).map(s => `${s.name}: ${s.avg}%`).join(", ");

  const messages = [
    {
      role: "system",
      content: `Ты репетитор ЕНТ (Единое национальное тестирование, Казахстан). Составь персональный 7-дневный план подготовки на русском языке.

Верни строго JSON формат:
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
- В выходные — легче, повторение`
    },
    {
      role: "user",
      content: `Данные ученика:
Общий средний балл: ${overall}%
Всего тестов: ${totalTests}
Серия дней: ${streak || 0}

Слабые предметы:
${weakText || "нет данных"}

Сильные предметы: ${strongText || "нет данных"}`
    },
  ];

  try {
    const aiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages,
        max_tokens: 1200,
        temperature: 0.7,
        response_format: { type: "json_object" },
      }),
    });

    if (!aiRes.ok) {
      const err = await aiRes.text();
      console.error("OpenAI error:", err);
      return Response.json({ error: "AI временно недоступен. Попробуйте позже." }, { status: 500 });
    }

    const data = await aiRes.json();
    const raw = data.choices?.[0]?.message?.content?.trim() || "";
    try {
      const parsed = JSON.parse(raw);
      if (!parsed.summary || !Array.isArray(parsed.days)) {
        return Response.json({ error: "Invalid plan format" }, { status: 500 });
      }
      return Response.json(parsed);
    } catch {
      console.error("Failed to parse plan JSON:", raw);
      return Response.json({ error: "Не удалось сформировать план. Попробуйте ещё раз." }, { status: 500 });
    }
  } catch (err) {
    console.error("OpenAI fetch error:", err);
    return Response.json({ error: "AI service unavailable" }, { status: 500 });
  }
}

export const config = {
  path: "/api/ai-plan",
};
