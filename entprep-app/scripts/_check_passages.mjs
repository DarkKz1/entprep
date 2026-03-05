import { createClient } from '@supabase/supabase-js';
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const { data } = await sb.from('questions').select('passage_group,passage_title,idx,q').eq('subject','reading').not('passage_group','is',null).order('passage_group').order('idx');
const groups = {};
for (const r of data) {
  const g = r.passage_group;
  if (!groups[g]) groups[g] = [];
  groups[g].push(r);
}
let dups = 0;
for (const [g, rows] of Object.entries(groups)) {
  if (rows.length > 5) {
    dups++;
    const titles = [...new Set(rows.map(r => r.passage_title))];
    console.log(`pg:${g} count:${rows.length} titles: ${JSON.stringify(titles.map(t => t.slice(0,50)))}`);
    // Show questions
    rows.forEach(r => console.log(`  idx:${r.idx} | ${r.q.slice(0,70)}`));
  }
}
console.log(`\nTotal groups with >5 qs: ${dups}`);
console.log(`Total passages: ${Object.keys(groups).length}`);
console.log(`Total reading qs: ${data.length}`);
