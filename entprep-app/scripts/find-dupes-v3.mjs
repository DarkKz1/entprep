// Find true duplicate questions — excludes reading passage questions from dedup
// Usage: SUPABASE_URL=x SUPABASE_SERVICE_KEY=y node scripts/find-dupes-v3.mjs

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

const allQuestions = await fetchAll("questions", "id,subject,idx,q,o,c,e,passage_group");
console.log(`${allQuestions.length} questions fetched\n`);

const bySubject = {};
for (const q of allQuestions) {
  if (!bySubject[q.subject]) bySubject[q.subject] = [];
  bySubject[q.subject].push(q);
}

const exactDupes = [];

for (const [subject, questions] of Object.entries(bySubject).sort()) {
  // For reading: only compare within same passage_group
  if (subject === "reading") {
    const byPassage = {};
    for (const q of questions) {
      const pg = q.passage_group || "none";
      if (!byPassage[pg]) byPassage[pg] = [];
      byPassage[pg].push(q);
    }

    for (const [pg, pQuestions] of Object.entries(byPassage)) {
      const tokenSets = pQuestions.map((q) => ({ ...q, tokens: new Set(tokenize(q.q)) }));
      for (let i = 0; i < tokenSets.length; i++) {
        for (let j = i + 1; j < tokenSets.length; j++) {
          const sim = jaccard(tokenSets[i].tokens, tokenSets[j].tokens);
          if (sim >= 1.0) {
            // Also check: same correct answer = true dupe; different = variant
            if (tokenSets[i].c === tokenSets[j].c) {
              exactDupes.push({ similarity: sim, a: tokenSets[i], b: tokenSets[j], subject });
            }
          }
        }
      }
    }
    continue;
  }

  // For other subjects: standard comparison
  const tokenSets = questions.map((q) => ({ ...q, tokens: new Set(tokenize(q.q)) }));
  for (let i = 0; i < tokenSets.length; i++) {
    for (let j = i + 1; j < tokenSets.length; j++) {
      const sim = jaccard(tokenSets[i].tokens, tokenSets[j].tokens);
      if (sim >= 1.0) {
        exactDupes.push({ similarity: sim, a: tokenSets[i], b: tokenSets[j], subject });
      }
    }
  }
}

console.log(`═══ TRUE EXACT DUPLICATES: ${exactDupes.length} pairs ═══\n`);

const toRemove = new Set();

for (const d of exactDupes) {
  const { a, b } = d;
  if (toRemove.has(a.id) || toRemove.has(b.id)) continue;

  // Pick which to remove
  const aExplLen = (a.e || "").length;
  const bExplLen = (b.e || "").length;
  let removeQ, keepQ;
  if (aExplLen < bExplLen) { removeQ = a; keepQ = b; }
  else if (bExplLen < aExplLen) { removeQ = b; keepQ = a; }
  else { removeQ = a.idx > b.idx ? a : b; keepQ = a.idx > b.idx ? b : a; }

  toRemove.add(removeQ.id);
  console.log(`  ${d.subject}[${removeQ.idx}] → DELETE (dupe of [${keepQ.idx}])`);
  console.log(`    Q: ${removeQ.q.slice(0, 90)}`);
}

console.log(`\nTotal to delete: ${toRemove.size}\n`);

// Generate SQL
const sqlLines = [
  `-- Delete true duplicate questions: ${toRemove.size} questions`,
  `-- Generated: ${new Date().toISOString()}`,
  `-- Reading passages: only same-passage, same-answer duplicates deleted`,
  "",
  "BEGIN;",
  "",
];

const removeBySubject = {};
for (const d of exactDupes) {
  const removeId = toRemove.has(d.a.id) ? d.a : toRemove.has(d.b.id) ? d.b : null;
  const keepId = removeId === d.a ? d.b : d.a;
  if (!removeId) continue;
  if (!removeBySubject[d.subject]) removeBySubject[d.subject] = new Set();
  if (!removeBySubject[d.subject].has(removeId.id)) {
    removeBySubject[d.subject].add(removeId.id);
  }
}

for (const [subject, ids] of Object.entries(removeBySubject).sort()) {
  sqlLines.push(`-- ${subject}: ${ids.size} duplicates`);
  for (const id of ids) {
    const q = allQuestions.find(q => q.id === id);
    sqlLines.push(`DELETE FROM questions WHERE id = '${id}'; -- [${q?.idx}]`);
  }
  sqlLines.push("");
}

sqlLines.push("COMMIT;");
sqlLines.push("");
sqlLines.push(`-- After: should remove ${toRemove.size} questions from ${allQuestions.length} total`);

const outPath = "supabase/migrations/delete_true_duplicates.sql";
writeFileSync(outPath, sqlLines.join("\n"));
console.log(`SQL written to ${outPath}`);

// Also show per-subject count impact
console.log("\nPost-deletion counts:");
for (const [subject, questions] of Object.entries(bySubject).sort()) {
  const removed = [...toRemove].filter(id => questions.some(q => q.id === id)).length;
  if (removed > 0) {
    console.log(`  ${subject}: ${questions.length} → ${questions.length - removed} (-${removed})`);
  }
}
