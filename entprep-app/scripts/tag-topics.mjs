// ENTprep Topic Tagging Script
// Assigns spec-aligned topic IDs to Supabase questions.
// Uses TOPIC_MAP index ranges (fast, free) + optional AI classification.
//
// Usage:
//   node scripts/tag-topics.mjs                          # dry run, untagged only
//   node scripts/tag-topics.mjs --subject=physics        # dry run, one subject
//   node scripts/tag-topics.mjs --commit                 # write to Supabase
//   node scripts/tag-topics.mjs --ai --commit            # range + AI fallback
//   node scripts/tag-topics.mjs --retag --ai --commit    # re-tag ALL questions (AI only)
//   node scripts/tag-topics.mjs --subtopics --commit     # AI subtopic tagging (requires topic)
//   node scripts/tag-topics.mjs --help

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const srcDir = join(__dirname, '..', 'src');

// ── Load TOPIC_MAP from .ts file (same pattern as ingest-questions.mjs) ─────

let _topicMapCache = null;
function loadTopicMap() {
  if (_topicMapCache) return _topicMapCache;
  const raw = readFileSync(join(srcDir, 'config/topics.ts'), 'utf-8');
  const cleaned = raw
    .replace(/^import\s+.*;\s*$/gm, '')
    .replace(/export\s+const\s+TOPIC_MAP:\s*Record<[^>]+>\s*=/, 'const TOPIC_MAP =')
    .replace(/export\s+function\s+\w+[\s\S]*$/, '');
  const fn = new Function(cleaned + '\nreturn TOPIC_MAP;');
  _topicMapCache = fn();
  return _topicMapCache;
}

// ── Load ENT_SPECS for richer AI context ────────────────────────────────────

let _specsCache = null;
function loadSpecs() {
  if (_specsCache) return _specsCache;
  // Dynamic import is async, so we load synchronously via require-like pattern
  // This will be called from async context
  return null; // loaded in main()
}

// ── CLI parser ──────────────────────────────────────────────────────────────

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = { subject: null, commit: false, ai: false, retag: false, subtopics: false, help: false };
  for (const a of args) {
    if (a === '--help' || a === '-h') opts.help = true;
    else if (a === '--commit') opts.commit = true;
    else if (a === '--ai') opts.ai = true;
    else if (a === '--retag') opts.retag = true;
    else if (a === '--subtopics') opts.subtopics = true;
    else if (a.startsWith('--subject=')) opts.subject = a.split('=')[1];
    else console.warn(`Unknown arg: ${a}`);
  }
  return opts;
}

function printHelp() {
  console.log(`
ENTprep Topic Tagging

Assigns spec-aligned topic IDs to Supabase questions.
Default mode: tags only questions where topic IS NULL (range + AI).
Retag mode: re-classifies ALL questions using AI (ignores existing tags).

Usage:
  node scripts/tag-topics.mjs [options]

Options:
  --subject=<id>    Process only one subject (default: all)
  --commit          Write changes to Supabase (default: dry run)
  --ai              Enable AI classification for questions outside ranges
  --retag           Re-tag ALL questions (requires --ai, ignores existing tags)
  --subtopics       AI subtopic tagging: assigns subtopic within each question's section
  --help            Show this help

Environment:
  SUPABASE_URL          Required
  SUPABASE_SERVICE_KEY  Required
  ANTHROPIC_API_KEY     Required with --ai or --retag

Safety:
  - Dry run by default (no changes without --commit)
  - Only updates the 'topic' column — never touches q, o, c, e
  - Default mode: only targets rows where topic IS NULL
  - Retag mode: overwrites ALL topic values with fresh AI classification
  - Skips 'reading' subject (no topics by design)
`);
}

// ── Topic matching by idx range ─────────────────────────────────────────────

function findTopicByIdx(subject, idx, topicMap) {
  if (idx == null) return null;
  const topics = topicMap[subject];
  if (!topics) return null;
  for (const topic of topics) {
    for (const [start, end] of topic.ranges) {
      if (idx >= start && idx <= end) return topic.id;
    }
  }
  return null;
}

// ── AI classification ───────────────────────────────────────────────────────

async function classifyWithAI(questions, subject, topicMap, specsMap) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('ANTHROPIC_API_KEY required for --ai/--retag mode');
    return [];
  }

  const topics = topicMap[subject];
  if (!topics) return [];

  // Build topic list with spec context if available
  const spec = specsMap?.[subject];
  let topicList;
  if (spec) {
    topicList = spec.sections.map(s => {
      const topicNames = s.topics.map(t => t.name).slice(0, 5).join(', ');
      return `  - "${s.id}": ${s.name} (примеры: ${topicNames}${s.topics.length > 5 ? '...' : ''})`;
    }).join('\n');
  } else {
    topicList = topics.map(t => `  - "${t.id}": ${t.name}`).join('\n');
  }

  const results = [];
  const BATCH_SIZE = 40; // Haiku handles larger batches well

  const totalBatches = Math.ceil(questions.length / BATCH_SIZE);

  for (let i = 0; i < questions.length; i += BATCH_SIZE) {
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const batch = questions.slice(i, i + BATCH_SIZE);

    // Use sequential numbers (1, 2, 3...) in prompt, map back to UUIDs after
    const idxToUuid = {};
    const questionsText = batch.map((q, j) => {
      const num = j + 1;
      idxToUuid[num] = q.id; // map prompt number → actual UUID
      const opts = Array.isArray(q.o) ? q.o.join(' | ') : '';
      return `${num}. ${q.q}${opts ? '\n   Options: ' + opts : ''}`;
    }).join('\n');

    const prompt = `You are classifying ENT exam questions for the subject "${subject}".
Assign each question to exactly one topic from the list below.

Available topics:
${topicList}

Questions to classify:
${questionsText}

Return a JSON array: [{"n": 1, "topic": "topic_id"}, ...] where "n" is the question number. No other text.`;

    try {
      const resp = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 4096,
          messages: [{ role: 'user', content: prompt }],
        }),
      });

      if (!resp.ok) {
        const body = await resp.text().catch(() => '');
        console.error(`    AI error batch ${batchNum}/${totalBatches}: ${resp.status} ${resp.statusText} ${body.slice(0, 200)}`);
        if (resp.status === 429) {
          console.log('    Rate limited, waiting 30s...');
          await new Promise(r => setTimeout(r, 30000));
          i -= BATCH_SIZE; // retry this batch
        }
        continue;
      }

      const data = await resp.json();
      const text = data.content?.[0]?.text || '';
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        console.error(`    AI returned no JSON (batch ${batchNum}/${totalBatches})`);
        continue;
      }

      const parsed = JSON.parse(jsonMatch[0]);
      const validTopicIds = new Set(topics.map(t => t.id));
      let batchOk = 0;
      let batchBad = 0;

      for (const item of parsed) {
        // Map "n" (question number) back to actual UUID
        const num = item.n ?? item.id; // support both "n" and "id" keys
        const uuid = idxToUuid[num];
        if (uuid && item.topic && validTopicIds.has(item.topic)) {
          results.push({ id: uuid, topic: item.topic });
          batchOk++;
        } else if (!uuid) {
          // AI returned unexpected number — skip silently
          batchBad++;
        } else {
          console.warn(`    Invalid topic "${item.topic}" for n=${num}`);
          batchBad++;
        }
      }

      process.stdout.write(`    Batch ${batchNum}/${totalBatches}: ${batchOk} ok${batchBad ? `, ${batchBad} invalid` : ''}\r`);

      // Rate limit: wait between batches
      if (i + BATCH_SIZE < questions.length) {
        await new Promise(r => setTimeout(r, 500));
      }
    } catch (err) {
      console.error(`    AI error batch ${batchNum}/${totalBatches}: ${err.message}`);
    }
  }

  console.log(); // newline after \r progress
  return results;
}

// ── Batch update Supabase ───────────────────────────────────────────────────

async function batchCommit(sb, updates) {
  // Group by topic for efficient bulk updates
  const byTopic = {};
  for (const u of updates) {
    (byTopic[u.topic] ||= []).push(u.id);
  }

  let ok = 0;
  let fail = 0;

  for (const [topic, ids] of Object.entries(byTopic)) {
    // Supabase .in() supports up to 1000 items
    for (let i = 0; i < ids.length; i += 500) {
      const batch = ids.slice(i, i + 500);
      const { error } = await sb.from('questions')
        .update({ topic })
        .in('id', batch);
      if (error) {
        console.error(`    FAIL topic=${topic} (${batch.length} rows): ${error.message}`);
        fail += batch.length;
      } else {
        ok += batch.length;
      }
    }
  }

  return { ok, fail };
}

// ── Subtopic AI classification ──────────────────────────────────────────────
// Classifies questions within their KNOWN section into specific subtopics.
// Much more accurate than open classification: AI picks from 2-14 choices.

async function classifySubtopicsForSection(questions, subject, sectionId, specsMap) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) { console.error('ANTHROPIC_API_KEY required'); return []; }

  const spec = specsMap?.[subject];
  if (!spec) { console.error(`No spec for ${subject}`); return []; }

  const section = spec.sections.find(s => s.id === sectionId);
  if (!section || !section.topics) { return []; }

  // Build subtopic choice list from spec
  const subtopicList = section.topics.map(t =>
    `  - "${t.id}": ${t.name}`
  ).join('\n');

  // If only 1 subtopic, assign all questions to it
  if (section.topics.length === 1) {
    return questions.map(q => ({ id: q.id, subtopic: section.topics[0].id }));
  }

  const results = [];
  const BATCH_SIZE = 40;
  const totalBatches = Math.ceil(questions.length / BATCH_SIZE);

  for (let i = 0; i < questions.length; i += BATCH_SIZE) {
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const batch = questions.slice(i, i + BATCH_SIZE);

    const idxToUuid = {};
    const questionsText = batch.map((q, j) => {
      const num = j + 1;
      idxToUuid[num] = q.id;
      const opts = Array.isArray(q.o) ? q.o.join(' | ') : '';
      return `${num}. ${q.q}${opts ? '\n   Options: ' + opts : ''}`;
    }).join('\n');

    const prompt = `You are classifying ENT exam questions for "${subject}", section "${section.name}".
Assign each question to exactly one subtopic from the list below.

Available subtopics for this section:
${subtopicList}

Questions to classify:
${questionsText}

Return a JSON array: [{"n": 1, "subtopic": "subtopic_id"}, ...] where "n" is the question number. No other text.`;

    try {
      const resp = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 4096,
          messages: [{ role: 'user', content: prompt }],
        }),
      });

      if (!resp.ok) {
        const body = await resp.text().catch(() => '');
        console.error(`    AI error batch ${batchNum}/${totalBatches}: ${resp.status} ${body.slice(0, 200)}`);
        if (resp.status === 429) {
          console.log('    Rate limited, waiting 30s...');
          await new Promise(r => setTimeout(r, 30000));
          i -= BATCH_SIZE;
        }
        continue;
      }

      const data = await resp.json();
      const text = data.content?.[0]?.text || '';
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (!jsonMatch) { console.error(`    No JSON (batch ${batchNum})`); continue; }

      const parsed = JSON.parse(jsonMatch[0]);
      const validIds = new Set(section.topics.map(t => t.id));
      let batchOk = 0;

      for (const item of parsed) {
        const num = item.n ?? item.id;
        const uuid = idxToUuid[num];
        if (uuid && item.subtopic && validIds.has(item.subtopic)) {
          results.push({ id: uuid, subtopic: item.subtopic });
          batchOk++;
        }
      }

      process.stdout.write(`      Batch ${batchNum}/${totalBatches}: ${batchOk} ok\r`);

      if (i + BATCH_SIZE < questions.length) {
        await new Promise(r => setTimeout(r, 500));
      }
    } catch (err) {
      console.error(`    AI error batch ${batchNum}/${totalBatches}: ${err.message}`);
    }
  }

  if (totalBatches > 0) console.log();
  return results;
}

async function batchCommitSubtopics(sb, updates) {
  const bySubtopic = {};
  for (const u of updates) {
    (bySubtopic[u.subtopic] ||= []).push(u.id);
  }

  let ok = 0, fail = 0;
  for (const [subtopic, ids] of Object.entries(bySubtopic)) {
    for (let i = 0; i < ids.length; i += 500) {
      const batch = ids.slice(i, i + 500);
      const { error } = await sb.from('questions')
        .update({ subtopic })
        .in('id', batch);
      if (error) { console.error(`    FAIL subtopic=${subtopic}: ${error.message}`); fail += batch.length; }
      else ok += batch.length;
    }
  }
  return { ok, fail };
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const opts = parseArgs();
  if (opts.help) { printHelp(); return; }

  if (opts.retag && !opts.ai && !opts.subtopics) {
    console.error('Error: --retag requires --ai (AI classification is needed to re-tag)');
    process.exit(1);
  }

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
    console.error('Error: SUPABASE_URL and SUPABASE_SERVICE_KEY env vars required');
    process.exit(1);
  }

  if (opts.ai && !process.env.ANTHROPIC_API_KEY) {
    console.error('Error: ANTHROPIC_API_KEY required for --ai mode');
    process.exit(1);
  }

  const topicMap = loadTopicMap();

  // Load ENT_SPECS for richer AI prompts
  let specsMap = null;
  try {
    const { ENT_SPECS } = await import('./utils/ent-specs.mjs');
    specsMap = ENT_SPECS;
  } catch (e) {
    console.warn('Could not load ENT_SPECS, using basic topic names for AI');
  }

  const { createClient } = await import('@supabase/supabase-js');
  const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

  // ── Subtopics mode ──────────────────────────────────────────────────────
  if (opts.subtopics) {
    if (!process.env.ANTHROPIC_API_KEY) {
      console.error('Error: ANTHROPIC_API_KEY required for --subtopics mode');
      process.exit(1);
    }
    if (!specsMap) {
      console.error('Error: ENT_SPECS required for --subtopics mode');
      process.exit(1);
    }

    const allSubjects = Object.keys(topicMap).filter(s => topicMap[s] !== null);
    const subjects = opts.subject ? [opts.subject] : allSubjects;
    const mode = opts.commit ? 'COMMIT' : 'DRY RUN';
    console.log(`\n📋 Subtopic Tagging [${mode}${opts.commit ? '' : ' — use --commit to apply'}]`);
    console.log(`   Subjects: ${subjects.join(', ')}\n`);

    let totalTagged = 0, totalCommitted = 0;

    for (const subject of subjects) {
      // Fetch questions with topic but no subtopic
      let rows = [];
      let from = 0;
      while (true) {
        const query = sb.from('questions')
          .select('id, idx, subject, q, o, topic')
          .eq('subject', subject)
          .not('topic', 'is', null)
          .is('subtopic', null)
          .order('idx', { ascending: true })
          .range(from, from + 999);

        const { data, error } = await query;
        if (error) { console.error(`Error fetching ${subject}: ${error.message}`); break; }
        rows.push(...data);
        if (data.length < 1000) break;
        from += 1000;
      }

      if (rows.length === 0) { console.log(`  ${subject}: 0 untagged`); continue; }
      console.log(`  ${subject}: ${rows.length} questions to subtopic-tag`);

      // Group by section (topic)
      const bySection = {};
      for (const row of rows) {
        (bySection[row.topic] ||= []).push(row);
      }

      let subjectTagged = 0;
      for (const [sectionId, sectionRows] of Object.entries(bySection)) {
        const results = await classifySubtopicsForSection(sectionRows, subject, sectionId, specsMap);
        subjectTagged += results.length;

        if (!opts.commit && results.length > 0) {
          const sample = results.slice(0, 3);
          for (const u of sample) {
            console.log(`    [${sectionId}] id=${u.id} → ${u.subtopic}`);
          }
          if (results.length > 3) console.log(`    ... and ${results.length - 3} more`);
        }

        if (opts.commit && results.length > 0) {
          const { ok, fail } = await batchCommitSubtopics(sb, results);
          totalCommitted += ok;
          if (fail) console.error(`    ${fail} failed for ${sectionId}`);
        }
      }

      totalTagged += subjectTagged;
      console.log(`    Total: ${subjectTagged}/${rows.length} classified`);
    }

    console.log(`\n${'─'.repeat(50)}`);
    console.log(`Summary: ${totalTagged} subtopic-tagged`);
    if (opts.commit) console.log(`  Committed: ${totalCommitted}`);
    console.log();
    return;
  }

  // Determine which subjects to process
  const allSubjects = Object.keys(topicMap).filter(s => topicMap[s] !== null);
  const subjects = opts.subject ? [opts.subject] : allSubjects;

  if (opts.subject && !allSubjects.includes(opts.subject)) {
    if (opts.subject === 'reading') {
      console.log('Reading has no topics — nothing to do.');
      return;
    }
    console.error(`Unknown subject: ${opts.subject}. Valid: ${allSubjects.join(', ')}`);
    process.exit(1);
  }

  const mode = opts.retag ? 'RETAG' : (opts.commit ? 'COMMIT' : 'DRY RUN');
  console.log(`\n📋 Topic Tagging [${mode}${opts.commit ? '' : ' — use --commit to apply'}]`);
  console.log(`   Subjects: ${subjects.join(', ')}`);
  console.log(`   AI: ${opts.ai ? 'Haiku 4.5' : 'disabled'}`);
  if (opts.retag) console.log(`   Mode: Re-tag ALL questions (overwrite existing topics)`);
  console.log();

  let totalRangeTagged = 0;
  let totalAiTagged = 0;
  let totalUnmatched = 0;
  let totalAlreadyTagged = 0;
  let totalCommitted = 0;
  let totalFailed = 0;

  for (const subject of subjects) {
    // Fetch questions
    let rows = [];
    let from = 0;
    while (true) {
      let query = sb.from('questions')
        .select('id, idx, subject, q, o, topic')
        .eq('subject', subject);

      // In default mode, only fetch untagged; in retag mode, fetch all
      if (!opts.retag) {
        query = query.is('topic', null);
      }

      query = query.order('idx', { ascending: true }).range(from, from + 999);

      const { data, error } = await query;
      if (error) {
        console.error(`Error fetching ${subject}: ${error.message}`);
        break;
      }
      rows.push(...data);
      if (data.length < 1000) break;
      from += 1000;
    }

    if (rows.length === 0) {
      const { count } = await sb.from('questions')
        .select('id', { count: 'exact', head: true })
        .eq('subject', subject)
        .not('topic', 'is', null);
      totalAlreadyTagged += count || 0;
      console.log(`  ${subject}: 0 to process (${count || 0} already tagged)`);
      continue;
    }

    console.log(`  ${subject}: ${rows.length} questions to ${opts.retag ? 're-tag' : 'tag'}`);

    let allUpdates = [];

    if (opts.retag) {
      // Retag mode: use AI for everything (skip range matching)
      console.log(`    Running AI classification for ${rows.length} questions...`);
      const aiResults = await classifyWithAI(rows, subject, topicMap, specsMap);
      allUpdates = aiResults.map(r => ({ ...r, method: 'ai' }));
      totalAiTagged += allUpdates.length;
      totalUnmatched += rows.length - allUpdates.length;
      console.log(`    AI classified: ${allUpdates.length}/${rows.length}`);
    } else {
      // Default mode: range matching first, then AI for remainder
      const rangeMatched = [];
      const unmatched = [];

      for (const row of rows) {
        const topicId = findTopicByIdx(subject, row.idx, topicMap);
        if (topicId) {
          rangeMatched.push({ id: row.id, idx: row.idx, topic: topicId, method: 'range' });
        } else {
          unmatched.push(row);
        }
      }

      console.log(`    Range-matched: ${rangeMatched.length}`);
      if (unmatched.length > 0) {
        console.log(`    Outside ranges: ${unmatched.length}`);
      }

      let aiMatched = [];
      if (opts.ai && unmatched.length > 0) {
        console.log(`    Running AI classification for ${unmatched.length} questions...`);
        const aiResults = await classifyWithAI(unmatched, subject, topicMap, specsMap);
        aiMatched = aiResults.map(r => ({ ...r, method: 'ai' }));
        console.log(`    AI-matched: ${aiMatched.length}`);
      }

      allUpdates = [...rangeMatched, ...aiMatched];
      totalRangeTagged += rangeMatched.length;
      totalAiTagged += aiMatched.length;
      totalUnmatched += unmatched.length - aiMatched.length;
    }

    // Show sample in dry run
    if (allUpdates.length > 0 && !opts.commit) {
      const sample = allUpdates.slice(0, 5);
      for (const u of sample) {
        console.log(`    [id=${u.id}] → ${u.topic} (${u.method})`);
      }
      if (allUpdates.length > 5) {
        console.log(`    ... and ${allUpdates.length - 5} more`);
      }
    }

    // Commit to Supabase (batched)
    if (opts.commit && allUpdates.length > 0) {
      const { ok, fail } = await batchCommit(sb, allUpdates);
      totalCommitted += ok;
      totalFailed += fail;
      console.log(`    Committed: ${ok} ok${fail ? `, ${fail} failed` : ''}`);
    }
  }

  // Summary
  console.log(`\n${'─'.repeat(50)}`);
  console.log(`Summary:`);
  if (!opts.retag && totalRangeTagged > 0) console.log(`  Range-tagged: ${totalRangeTagged}`);
  if (opts.ai) console.log(`  AI-tagged:    ${totalAiTagged}`);
  if (totalUnmatched > 0) console.log(`  Unmatched:    ${totalUnmatched}`);
  if (totalAlreadyTagged > 0) console.log(`  Already had topics: ${totalAlreadyTagged}`);
  if (opts.commit) console.log(`  Committed:    ${totalCommitted}${totalFailed ? ` (${totalFailed} failed)` : ''}`);
  console.log(`  Mode: ${mode}`);
  console.log();
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
