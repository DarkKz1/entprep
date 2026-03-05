/**
 * Extract JSON from AI response text.
 * Handles: direct parse, markdown code blocks, brace/bracket extraction.
 *
 * Used by: ingest-questions.mjs, replace-weak.mjs
 */
export function extractJSON(raw) {
  // Already parsed (e.g. from a JSON API response)
  if (typeof raw === 'object') return raw;

  // 1. Try direct parse
  try { return JSON.parse(raw); } catch {}

  // 2. Strip markdown code blocks (greedy — last closing ```)
  const codeBlockMatch = raw.match(/```(?:json)?\s*([\s\S]+)```/);
  if (codeBlockMatch) {
    try { return JSON.parse(codeBlockMatch[1].trim()); } catch {}
  }

  // 3. Find first { or [ and last matching } or ] — extract JSON substring
  const firstBrace = raw.indexOf('{');
  const firstBracket = raw.indexOf('[');
  const start = firstBrace >= 0 && (firstBracket < 0 || firstBrace < firstBracket) ? firstBrace : firstBracket;
  if (start >= 0) {
    const closer = raw[start] === '{' ? '}' : ']';
    const end = raw.lastIndexOf(closer);
    if (end > start) {
      try { return JSON.parse(raw.slice(start, end + 1)); } catch {}
    }
  }

  // 4. Give up
  throw new Error(`Could not extract JSON from response: ${raw.slice(0, 100)}...`);
}
