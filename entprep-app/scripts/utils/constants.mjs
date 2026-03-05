/**
 * Shared constants for question generation system.
 * Single source of truth for STEM subjects, subject names, valid subjects, etc.
 *
 * Used by: ingest-questions.mjs, replace-weak.mjs, generate-all.mjs, quality.mjs
 * Also re-exported from netlify/functions/utils/quality.mjs for runtime use.
 */

// ── Valid subject IDs ─────────────────────────────────────────────────────────
export const VALID_SUBJECTS = [
  'math', 'reading', 'history', 'math_profile', 'physics', 'biology',
  'english', 'chemistry', 'geography', 'world_history', 'informatics',
  'law', 'literature',
];

// ── Subject ID → Russian display name ─────────────────────────────────────────
export const SUBJECT_NAMES = {
  math: 'Математическая грамотность',
  reading: 'Грамотность чтения',
  history: 'История Казахстана',
  geography: 'География',
  english: 'Английский язык',
  math_profile: 'Математика (профильная)',
  physics: 'Физика',
  biology: 'Биология',
  chemistry: 'Химия',
  world_history: 'Всемирная история',
  informatics: 'Информатика',
  law: 'Основы права',
  literature: 'Литература',
};

// ── STEM subjects — use lower temperature + chain-of-thought ──────────────────
export const STEM_SUBJECTS = new Set([
  'math', 'math_profile', 'physics', 'chemistry', 'biology', 'informatics',
]);

// ── Temperature helpers ─────────────────────────────────────────────────────
export function getTemperature(subject) {
  return STEM_SUBJECTS.has(subject) ? 0.5 : 0.8;
}

// ── Chain-of-thought instruction for STEM ─────────────────────────────────────
export const STEM_COT_INSTRUCTION = `
ПРОЦЕСС РЕШЕНИЯ (ОБЯЗАТЕЛЬНО для каждого вопроса):
1. Сначала реши задачу самостоятельно — шаг за шагом
2. Проверь арифметику и единицы измерения
3. Убедись, что правильный ответ ТОЧНО совпадает с твоим решением
4. Только потом оформи JSON
Если при проверке обнаружил ошибку — ИСПРАВЬ перед выводом JSON.`;

export function getSTEMPrefix(subject) {
  return STEM_SUBJECTS.has(subject) ? STEM_COT_INSTRUCTION : '';
}

// ── Quality rules for AI prompts ──────────────────────────────────────────────
export const QUALITY_RULES = `
КАЧЕСТВО (КРИТИЧНО — нарушение = отклонение вопроса):
- ЗАПРЕЩЕНЫ тривиальные вопросы типа "Что такое X?", "Кто является Y?", "Назовите Z"
- Текст вопроса НЕ ДОЛЖЕН содержать слова или формулировки, прямо указывающие на ответ
- ЗАПРЕЩЕНЫ вопросы где ответ очевиден из контекста или формулировки
- Вопросы должны требовать АНАЛИЗА, СРАВНЕНИЯ или ПРИМЕНЕНИЯ знаний, а НЕ зубрёжки определений
- Дистракторы (неправильные ответы) должны быть ПРАВДОПОДОБНЫМИ — требовать реальных знаний для отсева
- НЕ используй шаблоны "Какой из перечисленных...", если ответ легко угадать исключением
- Уровень: средний-сложный ЕНТ, вопросы из второй половины теста (не разминочные)
- ЗАПРЕЩЕНЫ формулировки "X — это:", минимум 30 символов в вопросе
- ЗАПРЕЩЕНЫ вопросы начинающиеся с "Что такое", "Кто был", "Кто является", "Как называется", "Назовите"
- Объяснение должно быть ОБРАЗОВАТЕЛЬНЫМ (1-3 предложения), а НЕ просто "Правильный ответ: X"`;

// ── AI models ───────────────────────────────────────────────────────────────
// Default model for all generation (runtime + batch)
export const AI_MODEL = 'claude-sonnet-4-20250514';

// Model aliases for --model CLI flag in ingest-questions.mjs
export const MODEL_ALIASES = {
  sonnet: 'claude-sonnet-4-20250514',
  haiku:  'claude-haiku-4-5-20251001',
  opus:   'claude-opus-4-20250514',
};

// ── Dedup threshold ─────────────────────────────────────────────────────────
export const JACCARD_THRESHOLD = 0.70;
