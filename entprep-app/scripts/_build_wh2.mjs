// Helper script to build _gen_wh2.json incrementally
import { writeFileSync, readFileSync, existsSync } from 'fs';
const FILE = new URL('./_gen_wh2.json', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1');

function load() {
  if (existsSync(FILE)) return JSON.parse(readFileSync(FILE, 'utf8'));
  return [];
}
function save(arr) {
  writeFileSync(FILE, JSON.stringify(arr, null, 2), 'utf8');
  console.log(`Saved ${arr.length} questions to ${FILE}`);
}

const action = process.argv[2];
if (action === 'init') {
  save([]);
} else if (action === 'append') {
  const newData = JSON.parse(process.argv[3]);
  const existing = load();
  existing.push(...newData);
  save(existing);
} else if (action === 'count') {
  const arr = load();
  const counts = {};
  for (const q of arr) {
    const key = `${q.topic}/${q.subtopic}`;
    counts[key] = (counts[key] || 0) + 1;
  }
  console.log(JSON.stringify(counts, null, 2));
  console.log(`Total: ${arr.length}`);
}
