// Quick script to check subtopic distribution for subjects that need more questions
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const lines = readFileSync('.env', 'utf8').split('\n');
const env = {};
for (const l of lines) {
  if (!l || l.startsWith('#')) continue;
  const eq = l.indexOf('=');
  if (eq > 0) env[l.slice(0, eq).trim()] = l.slice(eq + 1).trim();
}

const url = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_KEY || env.VITE_SUPABASE_ANON_KEY;
const sb = createClient(url, key);

const subjects = ['chemistry', 'geography', 'world_history', 'informatics', 'law', 'literature'];

for (const sub of subjects) {
  const { data, error } = await sb.from('questions').select('topic, subtopic').eq('subject', sub);
  if (error) { console.error(sub, error.message); continue; }

  // Group by section (topic) then subtopic
  const sections = {};
  for (const r of data) {
    const sec = r.topic || '(none)';
    const st = r.subtopic || '(none)';
    if (!sections[sec]) sections[sec] = {};
    sections[sec][st] = (sections[sec][st] || 0) + 1;
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`${sub.toUpperCase()} — ${data.length} total`);
  console.log('='.repeat(60));

  const sortedSections = Object.entries(sections).sort((a, b) => {
    const totalA = Object.values(a[1]).reduce((s, v) => s + v, 0);
    const totalB = Object.values(b[1]).reduce((s, v) => s + v, 0);
    return totalB - totalA;
  });

  for (const [sec, subtopics] of sortedSections) {
    const secTotal = Object.values(subtopics).reduce((s, v) => s + v, 0);
    console.log(`\n  ${sec} (${secTotal})`);
    const sortedSt = Object.entries(subtopics).sort((a, b) => b[1] - a[1]);
    for (const [st, c] of sortedSt) {
      console.log(`    ${st.padEnd(42)} ${String(c).padStart(4)}`);
    }
  }
}
