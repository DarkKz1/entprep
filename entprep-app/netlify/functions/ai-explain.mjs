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

  const { question, options, userAnswer, correctAnswer, explanation } = body;

  if (!question || !options || correctAnswer === undefined) {
    return Response.json({ error: "Missing fields" }, { status: 400 });
  }

  // Call OpenAI
  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) {
    return Response.json({ error: "AI not configured" }, { status: 500 });
  }

  const optionsText = options.map((o, i) => `${String.fromCharCode(65 + i)}) ${o}`).join("\n");
  const userAnsText = userAnswer !== undefined ? options[userAnswer] : "пропущен";
  const correctAnsText = options[correctAnswer];

  const messages = [
    {
      role: "system",
      content:
        'Ты репетитор ЕНТ (Единое национальное тестирование, Казахстан). Ответь на русском. Не повторяй текст вопроса. Верни JSON: {"short":"1 предложение — суть почему этот ответ правильный","detailed":"3-5 предложений — подробный разбор, если ученик ошибся — объясни ошибку, простым языком"}',
    },
    {
      role: "user",
      content: `Вопрос: ${question}\n\nВарианты:\n${optionsText}\n\nУченик ответил: ${userAnsText}\nПравильный ответ: ${correctAnsText}\n\nКраткое пояснение: ${explanation || "нет"}`,
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
        max_tokens: 500,
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
      return Response.json({ short: parsed.short || raw, detailed: parsed.detailed || raw });
    } catch {
      return Response.json({ short: raw, detailed: raw });
    }
  } catch (err) {
    console.error("OpenAI fetch error:", err);
    return Response.json({ error: "AI service unavailable" }, { status: 500 });
  }
}

export const config = {
  path: "/api/ai-explain",
};
