import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
const env = readFileSync('.env','utf8');
env.split('\n').forEach(l => { const [k,...v] = l.split('='); if (k && !k.startsWith('#')) process.env[k.trim()] = v.join('=').trim(); });

const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY);

const id = '15e51298-ebc2-4272-9639-4a6e3742c7d0';
const { data, error } = await sb.from('questions').update({ c: 3 }).eq('id', id).select('id,q,o,c');

if (error) { console.error('ERROR:', error); process.exit(1); }
console.log('Fixed:', data[0].q);
console.log('Options:', data[0].o);
console.log('New c:', data[0].c, '→', data[0].o[data[0].c]);
