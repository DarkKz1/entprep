// Find all duplicate questions with full details for review
// Usage: SUPABASE_URL=x SUPABASE_SERVICE_KEY=y node scripts/find-dupes.mjs

import { createClient } from "@supabase/supabase-js";
import { writeFileSync } from "fs";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_KEY;
if (!url || !key) { console.error("SUPABASE_URL and SUPABASE_SERVICE_KEY required"); process.exit(1); }
const sb = createClient(url, key);

async function fetchAll(table, select) {
  const PAGE = 1000;
  const all = [];
  let offset = 0;
  while (true) {
    const { data, error } = await sb.from(table).select(select).range(offset, offset + PAGE - 1);
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < PAGE) break;
    offset += PAGE;
  }
  return all;
}

function tokenize(text) {
  return (text || "").toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, "").split(/\s+/).filter((w) => w.length > 2);
}

function jaccard(setA, setB) {
  if (setA.size === 0 && setB.size === 0) return 1;
  let inter = 0;
  for (const item of setA) if (setB.has(item)) inter++;
  const union = setA.size + setB.size - inter;
  return union === 0 ? 0 : inter / union;
}

const allQuestions = await fetchAll("questions", "id,subject,idx,q,o,c,e,topic");
console.log(`${allQuestions.length} questions fetched\n`);

const bySubject = {};
for (const q of allQuestions) {
  if (!bySubject[q.subject]) bySubject[q.subject] = [];
  bySubject[q.subject].push(q);
}

const THRESHOLD = 0.75;
const allDupes = [];

for (const [subject, questions] of Object.entries(bySubject).sort()) {
  const tokenSets = questions.map((q) => ({
    ...q,
    tokens: new Set(tokenize(q.q)),
  }));

  const dupes = [];
  for (let i = 0; i < tokenSets.length; i++) {
    for (let j = i + 1; j < tokenSets.length; j++) {
      const sim = jaccard(tokenSets[i].tokens, tokenSets[j].tokens);
      if (sim >= THRESHOLD) {
        dupes.push({
          similarity: sim,
          a: tokenSets[i],
          b: tokenSets[j],
        });
      }
    }
  }

  if (dupes.length === 0) continue;

  // Sort by similarity desc
  dupes.sort((a, b) => b.similarity - a.similarity);

  console.log(`═══ ${subject} (${dupes.length} duplicate pairs) ═══\n`);

  for (const d of dupes) {
    const { a, b, similarity } = d;
    console.log(`  Similarity: ${(similarity * 100).toFixed(0)}%`);
    console.log(`  [${a.idx}] Q: ${a.q.slice(0, 100)}`);
    console.log(`       O: ${a.o.map((o, i) => (i === a.c ? `[${o}]` : o)).join(" | ")}`);
    console.log(`  [${b.idx}] Q: ${b.q.slice(0, 100)}`);
    console.log(`       O: ${b.o.map((o, i) => (i === b.c ? `[${o}]` : o)).join(" | ")}`);

    // Decide which to remove: pick the one with shorter explanation or higher idx
    const aScore = (a.e || "").length;
    const bScore = (b.e || "").length;
    const removeId = aScore < bScore ? a.id : bScore < aScore ? b.id : (a.idx > b.idx ? a.id : b.id);
    const removeIdx = removeId === a.id ? a.idx : b.idx;
    console.log(`  → Remove: [${removeIdx}] (shorter explanation)\n`);

    allDupes.push({
      subject,
      similarity,
      keepId: removeId === a.id ? b.id : a.id,
      keepIdx: removeId === a.id ? b.idx : a.idx,
      removeId,
      removeIdx,
    });
  }
}

console.log(`\n${"═".repeat(60)}`);
console.log(`TOTAL: ${allDupes.length} duplicate pairs to resolve`);

// Generate DELETE SQL
const lines = [
  `-- Delete duplicate questions: ${allDupes.length} questions`,
  `-- Generated: ${new Date().toISOString()}`,
  "",
  "BEGIN;",
  "",
];

// Group by subject for readability
const bySubjectDupes = {};
for (const d of allDupes) {
  if (!bySubjectDupes[d.subject]) bySubjectDupes[d.subject] = [];
  bySubjectDupes[d.subject].push(d);
}

for (const [subject, dupes] of Object.entries(bySubjectDupes).sort()) {
  lines.push(`-- ${subject}: remove ${dupes.length} duplicates`);
  for (const d of dupes) {
    lines.push(`DELETE FROM questions WHERE id = '${d.removeId}'; -- ${subject}[${d.removeIdx}] (dupe of [${d.keepIdx}], ${(d.similarity * 100).toFixed(0)}%)`);
  }
  lines.push("");
}

lines.push("COMMIT;");
lines.push("");
lines.push("-- After deletion, re-index to fill gaps:");
lines.push("-- This is handled by the app since idx is just for reference");

const outPath = "supabase/migrations/delete_duplicates.sql";
writeFileSync(outPath, lines.join("\n"));
console.log(`\nSQL written to ${outPath}`);
