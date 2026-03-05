import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envFile = readFileSync(join(__dirname, '..', '.env'), 'utf-8');
const env = {};
for (const line of envFile.split(/\r?\n/)) {
  const m = line.match(/^([A-Z_]+)=(.+)/);
  if (m) env[m[1]] = m[2].replace(/\r/g, '').trim();
}

const SB_URL = env.SUPABASE_URL;
const SB_KEY = env.SUPABASE_SERVICE_KEY;

// Paginate to get all rows (Supabase default limit is 1000)
let data = [];
let offset = 0;
const PAGE = 1000;
while (true) {
  const r = await fetch(`${SB_URL}/rest/v1/questions?select=subject,topic,subtopic&order=id&limit=${PAGE}&offset=${offset}`, {
    headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` }
  });
  const page = await r.json();
  data = data.concat(page);
  if (page.length < PAGE) break;
  offset += PAGE;
}
console.log(`Fetched ${data.length} total rows\n`);

const counts = {};
for (const q of data) {
  const key = `${q.subject}|${q.topic}|${q.subtopic || 'null'}`;
  counts[key] = (counts[key] || 0) + 1;
}

const bySubject = {};
for (const [k, v] of Object.entries(counts)) {
  if (k.endsWith('|null') || v >= 30) continue;
  const [s, t, st] = k.split('|');
  if (!bySubject[s]) bySubject[s] = [];
  bySubject[s].push({ topic: t, subtopic: st, count: v, need: 30 - v });
}

let totalNeed = 0;
for (const [s, items] of Object.entries(bySubject).sort((a, b) =>
  b[1].reduce((x, i) => x + i.need, 0) - a[1].reduce((x, i) => x + i.need, 0)
)) {
  const subNeed = items.reduce((x, i) => x + i.need, 0);
  totalNeed += subNeed;
  console.log(`${s} (${items.length} subtopics, need ${subNeed}):`);
  items.sort((a, b) => a.count - b.count);
  for (const i of items) {
    console.log(`  ${i.count}->30 (+${i.need}) ${i.topic}/${i.subtopic}`);
  }
}
console.log(`\nTOTAL: ${totalNeed} questions needed across ${Object.values(bySubject).reduce((x, v) => x + v.length, 0)} subtopics`);

const subjTotals = {};
for (const q of data) { subjTotals[q.subject] = (subjTotals[q.subject] || 0) + 1; }
console.log('\nSubject totals:');
for (const [s, c] of Object.entries(subjTotals).sort((a, b) => a[1] - b[1])) {
  console.log(`  ${s}: ${c}`);
}
console.log(`  TOTAL: ${data.length}`);
