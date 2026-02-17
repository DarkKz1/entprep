const ADMIN_EMAILS = ["dzakpelov@gmail.com", "monabekova2@gmail.com"];

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

  let userEmail;
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

    const userData = await userRes.json();
    userEmail = userData.email;
  } catch {
    return Response.json({ error: "Auth check failed" }, { status: 401 });
  }

  // Admin-only
  if (!ADMIN_EMAILS.includes(userEmail)) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  // Parse request body
  let body;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { subject, topic, examples } = body;

  if (!subject || !examples || !Array.isArray(examples) || examples.length === 0) {
    return Response.json({ error: "Missing fields: subject, examples" }, { status: 400 });
  }

  // Call OpenAI
  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) {
    return Response.json({ error: "AI not configured" }, { status: 500 });
  }

  const examplesText = examples
    .map(
      (ex, i) =>
        `Пример ${i + 1}:\nВопрос: ${ex.q}\nА) ${ex.o[0]}\nБ) ${ex.o[1]}\nВ) ${ex.o[2]}\nГ) ${ex.o[3]}\nПравильный: ${["А", "Б", "В", "Г"][ex.c]}\nОбъяснение: ${ex.e}`
    )
    .join("\n\n");

  const topicHint = topic ? ` по теме "${topic}"` : "";

  const messages = [
    {
      role: "system",
      content: `Ты опытный составитель ЕНТ (Единое национальное тестирование, Казахстан) с 15-летним стажем. Твоя задача — создавать вопросы ПОВЫШЕННОЙ сложности, которые реально встречаются на ЕНТ и пробниках.

КРИТИЧЕСКИ ВАЖНЫЕ ПРАВИЛА:
1. Вопрос должен быть СЛОЖНЫМ — уровень реального ЕНТ, НЕ школьный учебник. Избегай банальных вопросов типа "Что такое X?" или "Столица Y".
2. Используй конкретные факты, даты, числа, формулы — НЕ общие знания.
3. Дистракторы (неправильные варианты) должны быть ПРАВДОПОДОБНЫМИ и похожими на правильный ответ. Ученик должен думать, а не угадывать.
4. Для точных наук — обязательно задачи с вычислениями, формулами, графиками.
5. Для гуманитарных — вопросы на анализ, сравнение, причинно-следственные связи, НЕ на простое определение.
6. Вопрос должен проверять ПОНИМАНИЕ, а не зубрёжку.
7. Вопрос должен быть уникальным и НЕ повторять примеры.

Предмет: "${subject}"${topicHint}

Верни строго JSON: {"q":"текст вопроса","o":["вариант А","вариант Б","вариант В","вариант Г"],"c":0,"e":"краткое объяснение правильного ответа"}
Поле c — индекс правильного ответа (0-3).`,
    },
    {
      role: "user",
      content: `Вот примеры существующих вопросов для образца стиля и формата (НО твой вопрос должен быть СЛОЖНЕЕ):\n\n${examplesText}\n\nСоздай 1 новый вопрос ПОВЫШЕННОЙ сложности. Не повторяй примеры. Верни только JSON.`,
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
        temperature: 0.9,
        response_format: { type: "json_object" },
      }),
    });

    if (!aiRes.ok) {
      const err = await aiRes.text();
      console.error("OpenAI error:", err);
      return Response.json(
        { error: "AI temporarily unavailable" },
        { status: 500 }
      );
    }

    const data = await aiRes.json();
    const raw = data.choices?.[0]?.message?.content?.trim() || "";

    try {
      const parsed = JSON.parse(raw);

      // Validate structure
      if (
        !parsed.q ||
        !Array.isArray(parsed.o) ||
        parsed.o.length !== 4 ||
        typeof parsed.c !== "number" ||
        parsed.c < 0 ||
        parsed.c > 3 ||
        !parsed.e
      ) {
        return Response.json(
          { error: "AI returned invalid question format" },
          { status: 500 }
        );
      }

      return Response.json(parsed);
    } catch {
      return Response.json(
        { error: "AI returned invalid JSON" },
        { status: 500 }
      );
    }
  } catch (err) {
    console.error("OpenAI fetch error:", err);
    return Response.json({ error: "AI service unavailable" }, { status: 500 });
  }
}

export const config = {
  path: "/api/ai-generate",
};
