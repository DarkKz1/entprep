// Find duplicate questions — split into SAFE deletes (100%) and REVIEW (75-99%)
// Usage: SUPABASE_URL=x SUPABASE_SERVICE_KEY=y node scripts/find-dupes-v2.mjs

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
const exactDupes = [];  // 100% similarity — safe to delete
const fuzzyDupes = [];  // 75-99% — need review

for (const [subject, questions] of Object.entries(bySubject).sort()) {
  const tokenSets = questions.map((q) => ({
    ...q,
    tokens: new Set(tokenize(q.q)),
  }));

  for (let i = 0; i < tokenSets.length; i++) {
    for (let j = i + 1; j < tokenSets.length; j++) {
      const sim = jaccard(tokenSets[i].tokens, tokenSets[j].tokens);
      if (sim < THRESHOLD) continue;

      const pair = {
        similarity: sim,
        a: tokenSets[i],
        b: tokenSets[j],
        subject,
      };

      if (sim >= 1.0) {
        exactDupes.push(pair);
      } else {
        fuzzyDupes.push(pair);
      }
    }
  }
}

// ── Exact duplicates: generate DELETE SQL ────────────────────────────────────

console.log(`═══ EXACT DUPLICATES (100% — safe to delete): ${exactDupes.length} ═══\n`);

// Track which IDs to remove (avoid removing both from a pair)
const toRemove = new Set();
const toKeep = new Set();

for (const d of exactDupes) {
  const { a, b } = d;
  // If one is already marked for removal, skip
  if (toRemove.has(a.id) || toRemove.has(b.id)) continue;

  // Pick which to remove: shorter explanation = lower quality
  const aExplLen = (a.e || "").length;
  const bExplLen = (b.e || "").length;
  let removeQ, keepQ;
  if (aExplLen < bExplLen) {
    removeQ = a; keepQ = b;
  } else if (bExplLen < aExplLen) {
    removeQ = b; keepQ = a;
  } else {
    // Same explanation length: remove higher idx
    removeQ = a.idx > b.idx ? a : b;
    keepQ = a.idx > b.idx ? b : a;
  }

  toRemove.add(removeQ.id);
  toKeep.add(keepQ.id);
  console.log(`  ${d.subject}[${removeQ.idx}] → DELETE (dupe of [${keepQ.idx}]): "${removeQ.q.slice(0, 80)}"`);
}

console.log(`\nTotal to delete: ${toRemove.size}\n`);

// Generate SQL
const sqlLines = [
  `-- Delete exact duplicate questions: ${toRemove.size} questions`,
  `-- Generated: ${new Date().toISOString()}`,
  "",
  "BEGIN;",
  "",
];

// Group by subject
const removeBySubject = {};
for (const d of exactDupes) {
  const removeId = toRemove.has(d.a.id) ? d.a : toRemove.has(d.b.id) ? d.b : null;
  const keepId = removeId === d.a ? d.b : d.a;
  if (!removeId) continue;
  if (!removeBySubject[d.subject]) removeBySubject[d.subject] = [];
  removeBySubject[d.subject].push({ removeId: removeId.id, removeIdx: removeId.idx, keepIdx: keepId.idx });
}

for (const [subject, items] of Object.entries(removeBySubject).sort()) {
  // Deduplicate (same id might appear multiple times)
  const seen = new Set();
  sqlLines.push(`-- ${subject}: ${items.length} duplicates`);
  for (const item of items) {
    if (seen.has(item.removeId)) continue;
    seen.add(item.removeId);
    sqlLines.push(`DELETE FROM questions WHERE id = '${item.removeId}'; -- [${item.removeIdx}] dupe of [${item.keepIdx}]`);
  }
  sqlLines.push("");
}

sqlLines.push("COMMIT;");

writeFileSync("supabase/migrations/delete_exact_duplicates.sql", sqlLines.join("\n"));
console.log(`SQL written to supabase/migrations/delete_exact_duplicates.sql`);

// ── Fuzzy duplicates: review list ────────────────────────────────────────────

console.log(`\n═══ FUZZY DUPLICATES (75-99% — REVIEW NEEDED): ${fuzzyDupes.length} ═══\n`);

fuzzyDupes.sort((a, b) => b.similarity - a.similarity);

// Separate: likely true dupes (>= 85%) vs false positives (< 85%)
const likelyDupes = fuzzyDupes.filter(d => d.similarity >= 0.85);
const possibleFP = fuzzyDupes.filter(d => d.similarity < 0.85);

console.log(`  Likely duplicates (>= 85%): ${likelyDupes.length}`);
for (const d of likelyDupes) {
  console.log(`    ${(d.similarity * 100).toFixed(0)}% ${d.subject}[${d.a.idx}] vs [${d.b.idx}]`);
  console.log(`       A: ${d.a.q.slice(0, 80)}`);
  console.log(`       B: ${d.b.q.slice(0, 80)}`);
}

console.log(`\n  Possible false positives (< 85%): ${possibleFP.length}`);
let truePositives = 0;
let falsePositives = 0;
for (const d of possibleFP) {
  // Heuristic: if both questions have same correct answer AND same options → likely dupe
  // If different correct answers → probably different questions
  const sameAnswer = d.a.c === d.b.c;
  const aOpts = (d.a.o || []).map(x => x.toLowerCase().trim()).sort().join("|");
  const bOpts = (d.b.o || []).map(x => x.toLowerCase().trim()).sort().join("|");
  const sameOpts = aOpts === bOpts;

  if (sameAnswer && sameOpts) {
    truePositives++;
    console.log(`    ⚠️  ${(d.similarity * 100).toFixed(0)}% ${d.subject}[${d.a.idx}] vs [${d.b.idx}] — SAME answer+options → TRUE DUPE`);
    console.log(`       A: ${d.a.q.slice(0, 80)}`);
    console.log(`       B: ${d.b.q.slice(0, 80)}`);
  } else {
    falsePositives++;
    if (process.argv.includes("--all")) {
      console.log(`    ✅ ${(d.similarity * 100).toFixed(0)}% ${d.subject}[${d.a.idx}] vs [${d.b.idx}] — DIFFERENT (false positive)`);
      console.log(`       A: ${d.a.q.slice(0, 60)}`);
      console.log(`       B: ${d.b.q.slice(0, 60)}`);
    }
  }
}
console.log(`\n  ${falsePositives} false positives filtered out`);

console.log(`\n${"═".repeat(60)}`);
console.log(`Summary:`);
console.log(`  Exact dupes (DELETE): ${toRemove.size}`);
console.log(`  Likely dupes (85%+): ${likelyDupes.length}`);
console.log(`  Low-sim true dupes: ${truePositives}`);
console.log(`  False positives: ${falsePositives}`);
