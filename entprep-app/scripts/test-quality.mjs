// Test Quality Script: validates all 13 question files
// Usage: node scripts/test-quality.mjs

import { fileURLToPath, pathToFileURL } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const srcDir = join(__dirname, "..", "src");
const toURL = (p) => pathToFileURL(p).href;

console.log("=".repeat(70));
console.log("  ENTprep Question Quality Report");
console.log("=".repeat(70));
console.log();

const { MQ }   = await import(toURL(join(srcDir, "data/questions/math_literacy.js")));
const { RP }   = await import(toURL(join(srcDir, "data/questions/reading_passages.js")));
const { HQ }   = await import(toURL(join(srcDir, "data/questions/history_kz.js")));
const { GEO }   = await import(toURL(join(srcDir, "data/questions/geography.js")));
const { ENG }   = await import(toURL(join(srcDir, "data/questions/english.js")));
const { MPQ }   = await import(toURL(join(srcDir, "data/questions/math_profile.js")));
const { PHYS }  = await import(toURL(join(srcDir, "data/questions/physics.js")));
const { BIO }   = await import(toURL(join(srcDir, "data/questions/biology.js")));
const { CHEM }  = await import(toURL(join(srcDir, "data/questions/chemistry.js")));
const { WH }   = await import(toURL(join(srcDir, "data/questions/world_history.js")));
const { INFO }  = await import(toURL(join(srcDir, "data/questions/informatics.js")));
const { LAW }   = await import(toURL(join(srcDir, "data/questions/law.js")));
const { LIT }   = await import(toURL(join(srcDir, "data/questions/literature.js")));

console.log("[OK] All 13 question files imported successfully.");
console.log();

const SUBJECTS = {
  math_literacy  : { data: MQ  , label: "Math Literacy" },
  history_kz     : { data: HQ  , label: "History KZ" },
  geography      : { data: GEO , label: "Geography" },
  english        : { data: ENG , label: "English" },
  math_profile   : { data: MPQ , label: "Math Profile" },
  physics        : { data: PHYS, label: "Physics" },
  biology        : { data: BIO , label: "Biology" },
  chemistry      : { data: CHEM, label: "Chemistry" },
  world_history  : { data: WH  , label: "World History" },
  informatics    : { data: INFO, label: "Informatics" },
  law            : { data: LAW , label: "Law" },
  literature     : { data: LIT , label: "Literature" },
};

console.log("-".repeat(70));
console.log("  VALIDATION: Required fields (q, o, c, e)");
console.log("-".repeat(70));

let totalQuestions = 0;
let totalErrors = 0;

function validateQuestion(question, subject, index) {
  const errors = [];
  if (typeof question.q !== "string" || question.q.trim().length === 0)
    errors.push("q is missing or not a string");
  if (!Array.isArray(question.o)) {
    errors.push("o is not an array");
  } else {
    if (question.o.length !== 4)
      errors.push("o has " + question.o.length + " options (expected 4)");
    question.o.forEach((opt, i) => {
      if (typeof opt !== "string" || opt.trim().length === 0)
        errors.push("o[" + i + "] is missing or not a string");
    });
  }
  if (typeof question.c !== "number" || question.c < 0 || question.c > 3 || !Number.isInteger(question.c))
    errors.push("c = " + question.c + " (expected integer 0-3)");
  if (typeof question.e !== "string" || question.e.trim().length === 0)
    errors.push("e is missing or not a string");
  if (errors.length > 0) {
    console.log("  [FAIL] " + subject + " #" + index + ": " + errors.join("; "));
    totalErrors += errors.length;
  }
  totalQuestions++;
}

for (const [key, { data, label }] of Object.entries(SUBJECTS)) {
  data.forEach((q, i) => validateQuestion(q, label, i));
}

RP.forEach((passage, pi) => {
  if (!passage.qs || !Array.isArray(passage.qs)) {
    console.log("  [FAIL] Reading #" + pi + ": qs is missing or not array");
    totalErrors++;
    return;
  }
  passage.qs.forEach((q, qi) => validateQuestion(q, "Reading P" + pi, qi));
});

if (totalErrors === 0) {
  console.log("  [OK] All " + totalQuestions + " questions passed validation.");
} else {
  console.log("  [!!] " + totalErrors + " validation errors found across " + totalQuestions + " questions.");
}
console.log();

console.log("-".repeat(70));
console.log("  OPTION LENGTH BIAS: correct answer > 1.5x avg wrong answer length");
console.log("-".repeat(70));

const RATIO_THRESHOLD = 1.5;

function checkBias(questions) {
  let biasedCount = 0;
  const biasedExamples = [];
  questions.forEach((q, i) => {
    if (!Array.isArray(q.o) || q.o.length !== 4 || typeof q.c !== "number") return;
    const correctLen = q.o[q.c].length;
    const wrongLens = q.o.filter((_, idx) => idx !== q.c).map(o => o.length);
    const avgWrongLen = wrongLens.reduce((a, b) => a + b, 0) / wrongLens.length;
    if (avgWrongLen > 0 && correctLen / avgWrongLen > RATIO_THRESHOLD) {
      biasedCount++;
      if (biasedExamples.length < 2) {
        biasedExamples.push({ index: i, ratio: (correctLen / avgWrongLen).toFixed(2), correct: q.o[q.c], wrongAvg: avgWrongLen.toFixed(0) });
      }
    }
  });
  return { biasedCount, total: questions.length, biasedExamples };
}

let totalBiased = 0;
let grandTotal = 0;

for (const [key, { data, label }] of Object.entries(SUBJECTS)) {
  const result = checkBias(data);
  const pct = ((result.biasedCount / result.total) * 100).toFixed(1);
  const status = result.biasedCount === 0 ? "[OK]" : result.biasedCount <= 5 ? "[..]" : "[!!]";
  console.log("  " + status + " " + label.padEnd(16) + " " + String(result.biasedCount).padStart(3) + "/" + result.total + " biased (" + pct + "%)");
  if (result.biasedExamples.length > 0) {
    result.biasedExamples.forEach(ex => {
      const tr = ex.correct.length > 50 ? ex.correct.substring(0, 50) + "..." : ex.correct;
      console.log("        #" + ex.index + ": ratio=" + ex.ratio + "x  correct=" + JSON.stringify(tr) + " avgWrong=" + ex.wrongAvg + "ch");
    });
  }
  totalBiased += result.biasedCount;
  grandTotal += result.total;
}

const rpFlat = RP.flatMap(p => p.qs || []);
const rpResult = checkBias(rpFlat);
const rpPct = ((rpResult.biasedCount / rpResult.total) * 100).toFixed(1);
const rpStatus = rpResult.biasedCount === 0 ? "[OK]" : rpResult.biasedCount <= 5 ? "[..]" : "[!!]";
console.log("  " + rpStatus + " " + "Reading".padEnd(16) + " " + String(rpResult.biasedCount).padStart(3) + "/" + rpResult.total + " biased (" + rpPct + "%)");
if (rpResult.biasedExamples.length > 0) {
  rpResult.biasedExamples.forEach(ex => {
    const tr = ex.correct.length > 50 ? ex.correct.substring(0, 50) + "..." : ex.correct;
    console.log("        #" + ex.index + ": ratio=" + ex.ratio + "x  correct=" + JSON.stringify(tr) + " avgWrong=" + ex.wrongAvg + "ch");
  });
}
totalBiased += rpResult.biasedCount;
grandTotal += rpResult.total;

console.log("  " + String.fromCharCode(9472).repeat(50));
console.log("  TOTAL: " + totalBiased + "/" + grandTotal + " biased (" + ((totalBiased / grandTotal) * 100).toFixed(1) + "%)");
console.log();

console.log("-".repeat(70));
console.log("  HISTORY KZ: Sample questions at indices 33, 137, 141");
console.log("-".repeat(70));

[33, 137, 141].forEach(idx => {
  if (idx >= HQ.length) {
    console.log("  [SKIP] Index " + idx + " out of range (HQ has " + HQ.length + " questions)");
    return;
  }
  const q = HQ[idx];
  const correctLen = q.o[q.c].length;
  const wrongLens = q.o.filter((_, i) => i !== q.c).map(o => o.length);
  const avgWrongLen = wrongLens.reduce((a, b) => a + b, 0) / wrongLens.length;
  const ratio = avgWrongLen > 0 ? (correctLen / avgWrongLen).toFixed(2) : "N/A";
  console.log();
  console.log("  --- HQ[" + idx + "] ---");
  console.log("  Q: " + q.q);
  console.log("  Options:");
  q.o.forEach((opt, i) => {
    const marker = i === q.c ? " <-- CORRECT" : "";
    console.log("    [" + i + "] (" + String(opt.length).padStart(3) + "ch) " + JSON.stringify(opt) + marker);
  });
  console.log("  Correct length: " + correctLen + "ch | Avg wrong: " + avgWrongLen.toFixed(0) + "ch | Ratio: " + ratio + "x");
  const expTrunc = q.e.length > 100 ? q.e.substring(0, 100) + "..." : q.e;
  console.log("  Explanation: " + expTrunc);
  if (avgWrongLen > 0 && correctLen / avgWrongLen > RATIO_THRESHOLD) {
    console.log("  STATUS: BIASED (ratio " + ratio + "x > " + RATIO_THRESHOLD + "x threshold)");
  } else {
    console.log("  STATUS: OK (ratio " + ratio + "x <= " + RATIO_THRESHOLD + "x threshold)");
  }
});
console.log();

console.log("-".repeat(70));
console.log("  READING PASSAGES: Structure check");
console.log("-".repeat(70));

const passageCount = RP.length;
let passagesOK = 0;
let passageErrors = [];

RP.forEach((p, i) => {
  const issues = [];
  if (typeof p.t !== "string" || p.t.trim().length === 0) issues.push("missing title (t)");
  if (typeof p.tx !== "string" || p.tx.trim().length === 0) issues.push("missing text (tx)");
  if (!Array.isArray(p.qs)) {
    issues.push("qs is not an array");
  } else if (p.qs.length !== 5) {
    issues.push("has " + p.qs.length + " questions (expected 5)");
  }
  if (issues.length === 0) passagesOK++;
  else passageErrors.push({ index: i, title: p.t || "???", issues });
});

console.log("  Total passages: " + passageCount + " (expected 30)");
console.log("  Valid passages (5 questions each): " + passagesOK);

if (passageErrors.length > 0) {
  console.log("  Errors:");
  passageErrors.forEach(pe => {
    console.log("    Passage #" + pe.index + " " + JSON.stringify(pe.title) + ": " + pe.issues.join(", "));
  });
}

if (passageCount === 30 && passagesOK === 30) {
  console.log("  [OK] All 30 passages have exactly 5 questions.");
} else {
  console.log("  [!!] Expected 30 passages x 5 questions. Found " + passageCount + " passages, " + passagesOK + " valid.");
}
console.log();

console.log("=".repeat(70));
console.log("  SUMMARY");
console.log("=".repeat(70));

const subjectCounts = Object.entries(SUBJECTS).map(([key, { data, label }]) => ({ label, count: data.length }));
subjectCounts.push({ label: "Reading", count: rpFlat.length });

console.log();
console.log("  Subject question counts:");
subjectCounts.forEach(({ label, count }) => {
  const status = count === 150 ? "[OK]" : "[!!]";
  console.log("    " + status + " " + label.padEnd(16) + " " + count + " questions");
});

const totalAllQs = subjectCounts.reduce((s, x) => s + x.count, 0);
console.log("    " + String.fromCharCode(9472).repeat(40));
console.log("    Total: " + totalAllQs + " questions (expected 1,950)");
console.log();

console.log("  Validation errors:  " + totalErrors);
console.log("  Length-biased:      " + totalBiased + "/" + grandTotal + " (" + ((totalBiased / grandTotal) * 100).toFixed(1) + "%)");
console.log("  Reading structure:  " + passageCount + " passages, " + passagesOK + " valid");
console.log();

if (totalErrors === 0 && totalBiased === 0 && passageCount === 30 && passagesOK === 30 && totalAllQs === 1950) {
  console.log("  *** ALL CHECKS PASSED ***");
} else {
  if (totalErrors > 0) console.log("  [!!] Fix validation errors above.");
  if (totalBiased > 0) console.log("  [!!] " + totalBiased + " questions have length-biased correct answers.");
  if (passageCount !== 30 || passagesOK !== 30) console.log("  [!!] Reading passages structure issues.");
  if (totalAllQs !== 1950) console.log("  [!!] Expected 1,950 total questions, got " + totalAllQs + ".");
}

console.log();
console.log("=".repeat(70));
