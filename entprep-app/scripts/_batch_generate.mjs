// Batch question generation — sequential with rate limit handling
// Generates 50 single questions per subject, one at a time
// Usage: node scripts/_batch_generate.mjs [--count=50] [--subjects=law,chemistry]

import { execSync } from 'child_process';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const scriptPath = join(__dirname, 'ingest-questions.mjs');

// Parse args
const args = process.argv.slice(2);
const countArg = args.find(a => a.startsWith('--count='));
const subjArg = args.find(a => a.startsWith('--subjects='));
const count = countArg ? parseInt(countArg.split('=')[1]) : 50;

// Subjects sorted by current count (lowest first)
const ALL_SUBJECTS = [
  'law',           // 478
  'geography',     // 483
  'math_profile',  // 486
  'chemistry',     // 489
  'world_history', // 491
  'informatics',   // 495
  'english',       // 508
  'history',       // 511
  'literature',    // 534
  'biology',       // 548
  'physics',       // 570
];

const subjects = subjArg ? subjArg.split('=')[1].split(',') : ALL_SUBJECTS;

console.log(`\n=== Batch Question Generation ===`);
console.log(`Subjects: ${subjects.join(', ')}`);
console.log(`Count per subject: ${count}`);
console.log(`Total target: ~${subjects.length * count} new questions\n`);

let totalGenerated = 0;
let errors = 0;

for (const subject of subjects) {
  console.log(`\n--- ${subject} (generating ${count}) ---`);
  const start = Date.now();

  try {
    const cmd = `node "${scriptPath}" --generate --subject=${subject} --count=${count} --output=supabase`;
    const output = execSync(cmd, {
      cwd: join(__dirname, '..'),
      env: process.env,
      timeout: 600000, // 10 min per subject
      stdio: 'pipe',
      encoding: 'utf-8',
    });

    // Extract counts from output
    const acquiredMatch = output.match(/Acquired:\s+(\d+)/);
    const insertedMatch = output.match(/Inserted:\s+(\d+)/);
    const acquired = acquiredMatch ? parseInt(acquiredMatch[1]) : 0;
    const inserted = insertedMatch ? parseInt(insertedMatch[1]) : acquired;

    totalGenerated += inserted || acquired;
    const elapsed = ((Date.now() - start) / 1000).toFixed(0);
    console.log(`  OK: acquired=${acquired}, inserted=${inserted}, time=${elapsed}s`);
    console.log(output.split('\n').filter(l => l.includes('Existing') || l.includes('Acquired') || l.includes('Insert') || l.includes('Done') || l.includes('dedupe')).map(l => '  ' + l.trim()).join('\n'));

  } catch (err) {
    errors++;
    const elapsed = ((Date.now() - start) / 1000).toFixed(0);
    console.error(`  FAIL (${elapsed}s): ${err.message?.slice(0, 200)}`);

    // If rate limited, wait longer and continue
    if (err.message?.includes('rate') || err.message?.includes('429')) {
      console.log('  Rate limited — waiting 120s...');
      await new Promise(r => setTimeout(r, 120000));
    }
  }

  // Pause between subjects to avoid rate limits
  console.log('  Pausing 45s for rate limits...');
  await new Promise(r => setTimeout(r, 45000));
}

console.log(`\n=== DONE ===`);
console.log(`Generated: ~${totalGenerated} questions`);
console.log(`Errors: ${errors}`);
console.log(`Subjects processed: ${subjects.length}`);
