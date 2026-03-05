import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
const env = readFileSync('.env','utf8');
env.split('\n').forEach(l => { const [k,...v] = l.split('='); if (k && !k.startsWith('#')) process.env[k.trim()] = v.join('=').trim(); });

const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

const subjects = ['math','reading','history','math_profile','physics','biology','chemistry','geography','english','world_history','informatics','law','literature'];

let total = 0;
for (const s of subjects) {
  const { count } = await sb.from('questions').select('*', { count: 'exact', head: true }).eq('subject', s);
  const c = count || 0;
  console.log(s.padEnd(15), String(c).padStart(5), c >= 2000 ? 'OK' : 'NEED '+(2000-c));
  total += c;
}
console.log('---');
console.log('TOTAL'.padEnd(15), String(total).padStart(5));
