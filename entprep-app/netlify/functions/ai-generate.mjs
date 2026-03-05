// AI question generation using Claude Sonnet 4.6
// Strict quality rules for ENT-level questions
// Post-generation validation: self-answer, trivial, short, weak explanation, dedup

import { corsResponse, CORS_HEADERS, verifyAuth, createRateLimiter, rateLimitResponse, validateGenerate } from "./utils/shared.mjs";
import { checkGenerated, tokenize, jaccard } from "./utils/quality.mjs";
import { SUBJECT_NAMES, getTemperature, getSTEMPrefix, JACCARD_THRESHOLD, QUALITY_RULES, AI_MODEL, ANTHROPIC_API_URL } from "./utils/constants.mjs";

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "").split(",").map(e => e.trim()).filter(Boolean);
const checkRate = createRateLimiter("generate", { max: 10, windowSec: 60 });

export default async function handler(req) {
  if (req.method === "OPTIONS") return corsResponse();
  if (req.method !== "POST") return Response.json({ error: "Method not allowed" }, { status: 405, headers: CORS_HEADERS });

  // Auth
  const user = await verifyAuth(req);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401, headers: CORS_HEADERS });

  // Admin-only
  if (!ADMIN_EMAILS.includes(user.email)) return Response.json({ error: "Forbidden" }, { status: 403, headers: CORS_HEADERS });

  // Rate limit
  const retryAfter = checkRate(user.id);
  if (retryAfter) return rateLimitResponse(retryAfter);

  // Parse + validate
  let body;
  try { body = await req.json(); } catch { return Response.json({ error: "Invalid JSON" }, { status: 400, headers: CORS_HEADERS }); }

  const err = validateGenerate(body);
  if (err) return Response.json({ error: err }, { status: 400, headers: CORS_HEADERS });

  const { subject, topic, examples } = body;
  const subjectName = SUBJECT_NAMES[subject] || subject;

  // Claude API key
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return Response.json({ error: "AI not configured (ANTHROPIC_API_KEY missing)" }, { status: 500, headers: CORS_HEADERS });

  const examplesText = examples
    .map((ex, i) => `Пример ${i + 1}:\nВопрос: ${ex.q}\nА) ${ex.o[0]}\nБ) ${ex.o[1]}\nВ) ${ex.o[2]}\nГ) ${ex.o[3]}\nПравильный: ${["А", "Б", "В", "Г"][ex.c]}\nОбъяснение: ${ex.e}`)
    .join("\n\n");

  const topicHint = topic ? ` по теме "${topic}"` : "";
  const stemCoT = getSTEMPrefix(subject);

  const systemPrompt = `Ты опытный составитель ЕНТ (Единое национальное тестирование, Казахстан). Создавай вопросы уровня реального ЕНТ 2025-2026.

Предмет: "${subjectName}"${topicHint}
${stemCoT}
${QUALITY_RULES}

ДОПОЛНИТЕЛЬНЫЕ ПРАВИЛА:
- Для точных наук — задачи с конкретными числами, формулами, расчётами. Формулы в Unicode (², √, π, ×)
- Для гуманитарных — причинно-следственные связи, сравнение явлений, анализ ситуаций
- Все 4 варианта должны быть ПОХОЖИ по длине и стилю
- Правильный ответ НЕ должен быть самым длинным или самым коротким
- Объяснение должно УЧИТЬ: объяснить ПОЧЕМУ правильный ответ верен и ПОЧЕМУ другие неверны
- Вопрос должен быть УНИКАЛЬНЫМ — не повторять примеры

ЗАПРЕЩЕНО:
- "Все вышеперечисленное" / "Ничего из вышеперечисленного"
- Вопросы с отрицанием ("Какой НЕ является...")
- Тривиальные факты из первой главы учебника
- Правильный ответ, который можно угадать без знания предмета

Верни строго JSON (без markdown, без \`\`\`):
{"q":"текст вопроса","o":["вариант А","вариант Б","вариант В","вариант Г"],"c":0,"e":"подробное объяснение"}
Поле c — индекс правильного ответа (0-3).`;

  const userMessage = `Примеры существующих вопросов (для образца стиля, НЕ повторяй их):\n\n${examplesText}\n\nСоздай 1 новый аналитический вопрос повышенной сложности. Верни только JSON.`;

  // Helper: call Claude and parse response
  async function callClaude(messages) {
    const aiRes = await fetch(ANTHROPIC_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: AI_MODEL,
        max_tokens: 800,
        temperature: getTemperature(subject),
        system: systemPrompt,
        messages,
      }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      throw new Error(`API ${aiRes.status}: ${errText.slice(0, 200)}`);
    }

    const data = await aiRes.json();
    let raw = data.content?.[0]?.text?.trim() || "";
    raw = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();

    const parsed = JSON.parse(raw);
    if (!parsed.q || !Array.isArray(parsed.o) || parsed.o.length !== 4 || typeof parsed.c !== "number" || parsed.c < 0 || parsed.c > 3 || !parsed.e) {
      throw new Error("Invalid format");
    }
    return parsed;
  }

  // Dedup check: compare generated question against the examples (which represent existing questions)
  function isDuplicateOfExamples(question) {
    const newTokens = tokenize(question.q);
    for (const ex of examples) {
      const sim = jaccard(newTokens, tokenize(ex.q));
      if (sim >= JACCARD_THRESHOLD) return true;
    }
    return false;
  }

  try {
    // Attempt 1
    let parsed = await callClaude([{ role: "user", content: userMessage }]);

    // Quality gate: check for issues
    let issues = checkGenerated(parsed.q, parsed.o, parsed.c, parsed.e, subject);

    // Dedup gate: check against provided examples
    if (issues.length === 0 && isDuplicateOfExamples(parsed)) {
      issues.push("Вопрос слишком похож на существующий");
    }

    if (issues.length > 0) {
      console.log("Quality issues in generated question:", issues.join("; "));

      // Attempt 2: retry with feedback about what was wrong
      try {
        const retryMessage = `Предыдущий вопрос отклонён из-за проблем с качеством:\n${issues.map(i => `- ${i}`).join("\n")}\n\nОтклонённый вопрос: "${parsed.q}"\n\nСоздай ДРУГОЙ вопрос, избегая этих проблем. Верни только JSON.`;
        parsed = await callClaude([
          { role: "user", content: userMessage },
          { role: "assistant", content: JSON.stringify(parsed) },
          { role: "user", content: retryMessage },
        ]);

        const retryIssues = checkGenerated(parsed.q, parsed.o, parsed.c, parsed.e, subject);
        if (retryIssues.length > 0 || isDuplicateOfExamples(parsed)) {
          const allIssues = retryIssues.length > 0 ? retryIssues : ["Дубликат"];
          console.log("Retry also has issues:", allIssues.join("; "), "— rejecting");
          return Response.json(
            { error: "Не удалось сгенерировать качественный вопрос. Попробуйте ещё раз." },
            { status: 422, headers: CORS_HEADERS }
          );
        }
      } catch (retryErr) {
        console.log("Retry failed:", retryErr.message, "— returning original");
      }
    }

    // Auto-translate to Kazakh
    try {
      const trRes = await fetch(ANTHROPIC_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
        body: JSON.stringify({
          model: AI_MODEL,
          max_tokens: 800,
          temperature: 0.3,
          system: `Ты профессиональный переводчик учебных материалов с русского на казахский. Переводи точно и полностью. Числа, формулы, Unicode символы (², √, π) — без изменений. Количество вариантов ответа ТОЧНО совпадает с оригиналом. Верни строго JSON (без markdown): {"q_kk":"...","o_kk":["...","...","...","..."],"e_kk":"..."}`,
          messages: [{ role: "user", content: `Переведи на казахский:\nВопрос: ${parsed.q}\nВарианты: ${parsed.o.map((o, i) => `${["А","Б","В","Г"][i]}) ${o}`).join("; ")}\nОбъяснение: ${parsed.e}` }],
        }),
      });
      if (trRes.ok) {
        const trData = await trRes.json();
        let trRaw = trData.content?.[0]?.text?.trim() || "";
        trRaw = trRaw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
        const tr = JSON.parse(trRaw);
        if (tr.q_kk && Array.isArray(tr.o_kk) && tr.o_kk.length === 4 && tr.e_kk) {
          parsed.q_kk = tr.q_kk;
          parsed.o_kk = tr.o_kk;
          parsed.e_kk = tr.e_kk;
        }
      }
    } catch (trErr) {
      console.log("Auto-translate failed (non-critical):", trErr.message);
    }

    return Response.json(parsed, { headers: CORS_HEADERS });
  } catch (err) {
    console.error("Claude error:", err.message);
    const isFormat = err.message.includes("Invalid format") || err instanceof SyntaxError;
    return Response.json(
      { error: isFormat ? "AI returned invalid question format" : "AI service unavailable" },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}

export const config = { path: "/api/ai-generate" };
