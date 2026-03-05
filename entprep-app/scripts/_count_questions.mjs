import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

// Load .env manually
const __dirname = dirname(fileURLToPath(import.meta.url));
const envFile = readFileSync(join(__dirname, '..', '.env'), 'utf-8');
const envVars = {};
for (const line of envFile.split('\n')) {
  const m = line.match(/^([A-Z_]+)=(.+)$/);
  if (m) envVars[m[1]] = m[2].trim();
}

const SUPABASE_URL = envVars.SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = envVars.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_KEY;
if (!SUPABASE_URL || !SUPABASE_KEY) { console.log('Missing env vars'); process.exit(1); }

const subjects = ['physics','biology','math_profile','english','chemistry','geography','world_history','informatics','law','literature','history','math','reading'];

let total = 0;
for (const s of subjects) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/questions?subject=eq.${s}&select=id`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, Prefer: 'count=exact' }
  });
  const count = r.headers.get('content-range')?.split('/')[1] || '?';
  const n = parseInt(count) || 0;
  total += n;

  // Get type breakdown
  const types = {};
  for (const t of ['single','multiple','matching']) {
    const r2 = await fetch(`${SUPABASE_URL}/rest/v1/questions?subject=eq.${s}&type=eq.${t}&select=id`, {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, Prefer: 'count=exact' }
    });
    types[t] = parseInt(r2.headers.get('content-range')?.split('/')[1]) || 0;
  }
  // Context = single with passage
  const r3 = await fetch(`${SUPABASE_URL}/rest/v1/questions?subject=eq.${s}&block=eq.context&select=id`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, Prefer: 'count=exact' }
  });
  types.context = parseInt(r3.headers.get('content-range')?.split('/')[1]) || 0;

  console.log(`${s.padEnd(15)} | ${String(types.single).padStart(5)} single | ${String(types.multiple).padStart(3)} mult | ${String(types.matching).padStart(3)} match | ${String(types.context).padStart(3)} ctx | ${String(n).padStart(5)} TOTAL`);
}
console.log(`\nGRAND TOTAL: ${total}`);
