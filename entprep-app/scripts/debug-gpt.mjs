const OPENAI_KEY = process.env.OPENAI_API_KEY;

const prompt = `У меня тестовые вопросы для ЕНТ. Правильный ответ (отмечен ✓) заметно длиннее остальных.

ЗАДАЧА: Сделай ВСЕ 4 варианта одинаковой длины и детализации. Дополни неправильные до такой же подробности. Не меняй смысл правильного ответа.

[0] Вопрос: Какие лагеря системы ГУЛАГ располагались на территории Казахстана?
А) Соловки
Б) АЛЖИР, Карлаг, Степлаг ✓
В) Колыма
Г) Норильлаг

[1] Вопрос: В каком году государство Караханидов официально приняло ислам?
А) 860
Б) 920
В) 960 ✓
Г) 1000

Верни СТРОГО JSON массив: [{"i":0,"o":["новый А","новый Б","новый В","новый Г"]},{"i":1,"o":["новый А","новый Б","новый В","новый Г"]}]
Только JSON, без markdown.`;

const res = await fetch('https://api.openai.com/v1/chat/completions', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${OPENAI_KEY}` },
  body: JSON.stringify({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 1000,
    temperature: 0.4,
    response_format: { type: 'json_object' },
  }),
});

const data = await res.json();
const raw = data.choices?.[0]?.message?.content;
console.log('RAW RESPONSE:');
console.log(raw);
console.log('\n---');

const parsed = JSON.parse(raw);
console.log('TYPE:', typeof parsed, Array.isArray(parsed) ? 'array' : 'object');
console.log('KEYS:', Object.keys(parsed));

const arr = Array.isArray(parsed) ? parsed : (parsed.results || parsed.data || Object.values(parsed)[0]);
console.log('EXTRACTED ARRAY:', JSON.stringify(arr, null, 2));
console.log('IS ARRAY:', Array.isArray(arr));
