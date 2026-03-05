// Fix reading passage_group: split groups that contain questions from different passages
import { createClient } from '@supabase/supabase-js';

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const { data: rows } = await sb.from('questions')
  .select('id,idx,passage_group,passage_title,passage_text')
  .eq('subject', 'reading')
  .not('passage_group', 'is', null)
  .order('passage_group')
  .order('idx');

// Group by passage_group
const groups = {};
for (const r of rows) {
  const g = r.passage_group;
  if (!groups[g]) groups[g] = [];
  groups[g].push(r);
}

// Find max passage_group to assign new ones
let maxPg = Math.max(...Object.keys(groups).map(Number));
console.log(`Current max passage_group: ${maxPg}`);
console.log(`Total groups: ${Object.keys(groups).length}`);

const updates = []; // {id, passage_group}

for (const [g, gRows] of Object.entries(groups)) {
  // Group by passage_title within this group
  const byTitle = {};
  for (const r of gRows) {
    const title = r.passage_title || 'untitled';
    if (!byTitle[title]) byTitle[title] = [];
    byTitle[title].push(r);
  }

  const titles = Object.keys(byTitle);
  if (titles.length <= 1) continue; // All same title — OK

  console.log(`\npg:${g} has ${titles.length} different titles (${gRows.length} qs):`);

  // Keep first title with original pg, reassign others
  let first = true;
  for (const [title, tRows] of Object.entries(byTitle)) {
    if (first) {
      console.log(`  KEEP pg:${g} — "${title.slice(0,50)}" (${tRows.length} qs)`);
      first = false;
      continue;
    }
    maxPg++;
    console.log(`  MOVE → pg:${maxPg} — "${title.slice(0,50)}" (${tRows.length} qs)`);
    for (const r of tRows) {
      updates.push({ id: r.id, passage_group: maxPg });
    }
  }
}

console.log(`\nTotal updates needed: ${updates.length}`);

if (updates.length === 0) {
  console.log('No fixes needed!');
  process.exit(0);
}

// Generate SQL
const sqlLines = updates.map(u =>
  `UPDATE questions SET passage_group = ${u.passage_group} WHERE id = '${u.id}';`
);

import { writeFileSync } from 'fs';
const sqlFile = 'supabase/migrations/fix_passage_groups.sql';
writeFileSync(sqlFile, '-- Fix reading passage_group collisions\n' + sqlLines.join('\n') + '\n');
console.log(`\nSQL written to ${sqlFile}`);

// Also apply directly via service key
console.log('\nApplying fixes directly...');
let applied = 0;
let errors = 0;
for (const u of updates) {
  const { error } = await sb.from('questions').update({ passage_group: u.passage_group }).eq('id', u.id);
  if (error) {
    console.error(`  ERROR updating ${u.id}: ${error.message}`);
    errors++;
  } else {
    applied++;
  }
}
console.log(`Applied: ${applied}, Errors: ${errors}`);

// Verify
const { data: verify } = await sb.from('questions')
  .select('passage_group,passage_title')
  .eq('subject', 'reading')
  .not('passage_group', 'is', null)
  .order('passage_group');

const vGroups = {};
for (const r of verify) {
  const g = r.passage_group;
  if (!vGroups[g]) vGroups[g] = new Set();
  vGroups[g].add(r.passage_title);
}
const bad = Object.entries(vGroups).filter(([,titles]) => titles.size > 1);
console.log(`\nVerification: ${bad.length === 0 ? 'ALL GOOD — every group has 1 title' : `${bad.length} groups still bad`}`);
