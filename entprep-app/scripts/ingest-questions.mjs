// ENTprep Question Ingestion Pipeline
// Usage:
//   node scripts/ingest-questions.mjs --generate --subject=physics --topic=mechanics --count=5 --dry-run
//   node scripts/ingest-questions.mjs --generate --subject=history --count=50
//   node scripts/ingest-questions.mjs --generate --subject=reading --count=3
//   node scripts/ingest-questions.mjs --rephrase --subject=physics --count=50 --dry-run
//   node scripts/ingest-questions.mjs --import batch.json --subject=english --output=file
//   node scripts/ingest-questions.mjs --help

// ── Section 0: Imports & paths ──────────────────────────────────────────────

import { fileURLToPath, pathToFileURL } from 'url';
import { dirname, join } from 'path';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { checkExplanationMismatch } from './utils/quality.mjs';
import { SUBJECT_NAMES, STEM_SUBJECTS, QUALITY_RULES, getSTEMPrefix, getTemperature, JACCARD_THRESHOLD, AI_MODEL, MODEL_ALIASES } from './utils/constants.mjs';
import { extractJSON } from './utils/json.mjs';
import { ENT_SPECS, buildTopicContext } from './utils/ent-specs.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const srcDir = join(__dirname, '..', 'src');
const toURL = (p) => pathToFileURL(p).href;

// ── Load TOPIC_MAP from .ts file (strip TS syntax, eval as JS) ──────────────
let _topicMapCache = null;
function loadTopicMap() {
  if (_topicMapCache) return _topicMapCache;
  const raw = readFileSync(join(srcDir, 'config/topics.ts'), 'utf-8');
  // Strip TS imports, type annotations, and export keyword
  const cleaned = raw
    .replace(/^import\s+.*;\s*$/gm, '')
    .replace(/export\s+const\s+TOPIC_MAP:\s*Record<[^>]+>\s*=/, 'const TOPIC_MAP =')
    .replace(/export\s+function\s+\w+[\s\S]*$/, ''); // remove exported functions at end
  const fn = new Function(cleaned + '\nreturn TOPIC_MAP;');
  _topicMapCache = fn();
  return _topicMapCache;
}

// ── Resolve topic ID to rich spec context for AI prompts ────────────────────
function getSpecContext(subject, topicId, subtopicId) {
  if (!topicId) return '';
  const spec = ENT_SPECS[subject];
  if (!spec) return `\nТема: ${topicId}`;
  const section = spec.sections.find(s => s.id === topicId);
  if (!section) return `\nТема: ${topicId}`;
  let ctx = '\n' + buildTopicContext(section);
  // If subtopic specified, highlight it as the focus
  if (subtopicId && section.topics) {
    const st = section.topics.find(t => t.id === subtopicId);
    if (st) ctx += `\n\nФокус: ${st.name}`;
  }
  return ctx;
}

// ── Section 1: Subject registry ─────────────────────────────────────────────

const SUBJECT_REGISTRY = {
  math:          { file: 'data/questions/math_literacy.ts',    exp: 'MQ',   isReading: false },
  reading:       { file: 'data/questions/reading_passages.ts', exp: 'RP',   isReading: true  },
  history:       { file: 'data/questions/history_kz.ts',       exp: 'HQ',   isReading: false },
  geography:     { file: 'data/questions/geography.ts',        exp: 'GEO',  isReading: false },
  english:       { file: 'data/questions/english.ts',          exp: 'ENG',  isReading: false },
  math_profile:  { file: 'data/questions/math_profile.ts',     exp: 'MPQ',  isReading: false },
  physics:       { file: 'data/questions/physics.ts',          exp: 'PHYS', isReading: false },
  biology:       { file: 'data/questions/biology.ts',          exp: 'BIO',  isReading: false },
  chemistry:     { file: 'data/questions/chemistry.ts',        exp: 'CHEM', isReading: false },
  world_history: { file: 'data/questions/world_history.ts',    exp: 'WH',   isReading: false },
  informatics:   { file: 'data/questions/informatics.ts',      exp: 'INFO', isReading: false },
  law:           { file: 'data/questions/law.ts',              exp: 'LAW',  isReading: false },
  literature:    { file: 'data/questions/literature.ts',       exp: 'LIT',  isReading: false },
};

// STEM_SUBJECTS imported from ./utils/constants.mjs

// ── Section 2: CLI parser ───────────────────────────────────────────────────

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = {
    mode: null,        // 'generate' | 'rephrase' | 'import'
    importFile: null,
    subject: null,
    topic: null,
    subtopic: null,    // subtopic ID (written to subtopic column)
    type: 'single',    // 'single' | 'multiple' | 'matching' | 'context'
    count: 15,
    output: 'supabase', // 'supabase' | 'file' | 'dry-run'
    model: 'sonnet',
    difficulty: null,  // 'easy' | 'medium' | 'hard' — null = no difficulty hint
    dryRun: false,
    skipVerify: false, // skip AI answer verification step (saves API calls)
    help: false,
  };

  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--help' || a === '-h') opts.help = true;
    else if (a === '--generate') opts.mode = 'generate';
    else if (a === '--rephrase') opts.mode = 'rephrase';
    else if (a === '--import') { opts.mode = 'import'; opts.importFile = args[++i]; }
    else if (a === '--dry-run') { opts.dryRun = true; opts.output = 'dry-run'; }
    else if (a === '--skip-verify') opts.skipVerify = true;
    else if (a.startsWith('--subject=')) opts.subject = a.split('=')[1];
    else if (a.startsWith('--topic=')) opts.topic = a.split('=')[1];
    else if (a.startsWith('--subtopic=')) opts.subtopic = a.split('=')[1];
    else if (a.startsWith('--count=')) opts.count = parseInt(a.split('=')[1], 10);
    else if (a.startsWith('--output=')) opts.output = a.split('=')[1];
    else if (a.startsWith('--model=')) opts.model = a.split('=')[1];
    else if (a.startsWith('--type=')) opts.type = a.split('=')[1];
    else if (a.startsWith('--difficulty=')) opts.difficulty = a.split('=')[1];
    else console.warn(`Unknown arg: ${a}`);
  }

  return opts;
}

function printHelp() {
  console.log(`
ENTprep Question Ingestion Pipeline

Usage:
  node scripts/ingest-questions.mjs --generate --subject=<id> [options]
  node scripts/ingest-questions.mjs --rephrase --subject=<id> --count=50 [options]
  node scripts/ingest-questions.mjs --import <file> --subject=<id> [options]

Modes:
  --generate            Generate new questions via AI (with reference examples)
  --rephrase            Rephrase existing questions (new numbers/context/wording)
  --import <file>       Import questions from a JSON file

Options:
  --subject=<id>        Subject ID (required). One of:
                        ${Object.keys(SUBJECT_REGISTRY).join(', ')}
  --topic=<id>          Topic/section ID (optional, for targeted generation)
  --subtopic=<id>       Subtopic ID (optional, written to subtopic column)
  --count=<n>           Number of questions to generate (default: 15)
                        For reading: number of passages (each = 5 questions)
  --output=<target>     Output target: supabase (default), file, dry-run
  --model=<model>       AI model (default: sonnet). Aliases:
                        sonnet, haiku, opus → Claude models
                        gpt-4o, gpt-4o-mini → OpenAI models
  --difficulty=<level>  Difficulty: easy, medium, hard (default: mixed)
  --dry-run             Validate only, no output (alias for --output=dry-run)
  --help                Show this help

Environment variables:
  ANTHROPIC_API_KEY     Required for Claude models (sonnet/haiku/opus)
  OPENAI_API_KEY        Required for OpenAI models (gpt-4o, etc.)
  SUPABASE_URL          Required for --output=supabase
  SUPABASE_SERVICE_KEY  Required for --output=supabase

Examples:
  # Generate 5 physics/mechanics questions with Claude Sonnet, dry run
  ANTHROPIC_API_KEY=xxx node scripts/ingest-questions.mjs \\
    --generate --subject=physics --topic=mechanics --count=5 --dry-run

  # Rephrase 50 existing physics questions (new numbers/context)
  ANTHROPIC_API_KEY=xxx node scripts/ingest-questions.mjs \\
    --rephrase --subject=physics --count=50 --dry-run

  # Generate 3 reading passages (= 15 questions)
  ANTHROPIC_API_KEY=xxx node scripts/ingest-questions.mjs \\
    --generate --subject=reading --count=3 --dry-run

  # Import from JSON file → append to .js file
  node scripts/ingest-questions.mjs --import batch.json --subject=english --output=file
`);
}

async function validateArgs(opts) {
  if (opts.help) { printHelp(); process.exit(0); }
  if (!opts.mode) fail('Specify --generate, --rephrase, or --import <file>');
  if (!opts.subject) fail('--subject=<id> is required');
  if (!SUBJECT_REGISTRY[opts.subject]) fail(`Unknown subject: ${opts.subject}. Valid: ${Object.keys(SUBJECT_REGISTRY).join(', ')}`);

  if (opts.mode === 'generate' || opts.mode === 'rephrase') {
    if (!process.env.ANTHROPIC_API_KEY) {
      fail('ANTHROPIC_API_KEY env var required');
    }
  }
  if (opts.mode === 'import' && (!opts.importFile || !existsSync(opts.importFile))) {
    fail(`Import file not found: ${opts.importFile}`);
  }
  if (opts.output === 'supabase') {
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
      fail('SUPABASE_URL and SUPABASE_SERVICE_KEY env vars required for --output=supabase');
    }
  }

  // Validate topic if provided (check both TOPIC_MAP and ENT_SPECS sections)
  if (opts.topic) {
    const TOPIC_MAP = loadTopicMap();
    const topics = TOPIC_MAP[opts.subject];
    const spec = ENT_SPECS[opts.subject];
    const validInTopicMap = topics && topics.find(t => t.id === opts.topic);
    const validInSpec = spec && spec.sections.find(s => s.id === opts.topic);
    if (!validInTopicMap && !validInSpec) {
      const allIds = [
        ...(topics || []).map(t => t.id),
        ...(spec ? spec.sections.map(s => s.id) : []),
      ];
      const unique = [...new Set(allIds)];
      fail(`Unknown topic "${opts.topic}" for ${opts.subject}. Valid: ${unique.join(', ')}`);
    }
  }

  // Validate subtopic if provided
  if (opts.subtopic) {
    const TOPIC_MAP = loadTopicMap();
    const topics = TOPIC_MAP[opts.subject];
    let validSubtopic = false;
    if (topics) {
      for (const section of topics) {
        if (section.subtopics && section.subtopics.some(st => st.id === opts.subtopic)) {
          validSubtopic = true;
          // Auto-set topic to the parent section if not already specified
          if (!opts.topic) opts.topic = section.id;
          break;
        }
      }
    }
    if (!validSubtopic) {
      const allSts = topics ? topics.flatMap(s => (s.subtopics || []).map(st => st.id)) : [];
      fail(`Unknown subtopic "${opts.subtopic}" for ${opts.subject}. Valid: ${allSts.join(', ')}`);
    }
  }

  if (isNaN(opts.count) || opts.count < 1) fail('--count must be a positive integer');

  // Validate difficulty if provided
  if (opts.difficulty && !['easy', 'medium', 'hard'].includes(opts.difficulty)) {
    fail(`Unknown difficulty "${opts.difficulty}". Valid: easy, medium, hard`);
  }
}

function fail(msg) {
  console.error(`\nError: ${msg}\n`);
  process.exit(1);
}

// ── Model aliases & provider detection ──────────────────────────────────────
// MODEL_ALIASES imported from ./utils/constants.mjs

function resolveModel(model) {
  return MODEL_ALIASES[model] || model;
}

function isAnthropicModel(model) {
  const resolved = resolveModel(model);
  return resolved.startsWith('claude-');
}

// ── Section 3: Normalization ────────────────────────────────────────────────

const OPTION_PREFIX_RE = /^[АБВГабвгABCDabcd]\)\s*/;
const CYRILLIC_PARENS_RE = /\s*\([а-яА-ЯёЁ][а-яА-ЯёЁ\s,ё]{3,}\)/g;

function normalizeQuestion(q) {
  const normalized = { ...q };

  // Trim all strings
  normalized.q = (normalized.q || '').trim();
  normalized.e = (normalized.e || '').trim();

  // Strip option letter prefixes
  if (Array.isArray(normalized.o)) {
    normalized.o = normalized.o.map(o => (o || '').trim().replace(OPTION_PREFIX_RE, ''));
  }

  // Strip Cyrillic parenthetical hints (with duplicate guard)
  if (Array.isArray(normalized.o)) {
    const stripped = normalized.o.map(o => o.replace(CYRILLIC_PARENS_RE, '').trim());
    CYRILLIC_PARENS_RE.lastIndex = 0;
    // Only apply if no duplicates created
    if (new Set(stripped).size >= new Set(normalized.o).size) {
      normalized.o = stripped;
    }
  }

  return normalized;
}

function normalizePassage(p) {
  return {
    t: (p.t || '').trim(),
    tx: (p.tx || '').trim(),
    qs: (p.qs || []).map(q => normalizeQuestion(q)),
  };
}

// ── Section 4: Validation ───────────────────────────────────────────────────

function validateQuestion(q, idx) {
  const errors = [];
  const warnings = [];

  // C1: q non-empty > 5 chars
  if (!q.q || q.q.trim().length <= 5) errors.push(`C1: q empty or <= 5 chars (idx ${idx})`);

  // C2: exactly 4 options
  if (!Array.isArray(q.o) || q.o.length !== 4) {
    errors.push(`C2: options count != 4 (idx ${idx}, got ${q.o?.length})`);
  } else {
    // C3: options non-empty
    for (let i = 0; i < 4; i++) {
      if (!q.o[i] || q.o[i].trim().length === 0) {
        errors.push(`C3: option[${i}] empty (idx ${idx})`);
      }
    }
    // C6: no duplicate options
    const trimmed = q.o.map(o => (o || '').trim());
    if (new Set(trimmed).size < 4) errors.push(`C6: duplicate options (idx ${idx})`);
  }

  // C4: c in range [0,3]
  if (!Number.isInteger(q.c) || q.c < 0 || q.c > 3) {
    errors.push(`C4: c=${q.c} out of range (idx ${idx})`);
  }

  // C5: explanation > 10 chars
  if (!q.e || q.e.trim().length <= 10) errors.push(`C5: explanation <= 10 chars (idx ${idx})`);

  // C7: explanation matches correct answer (catch wrong c index)
  if (q.q && Array.isArray(q.o) && q.o.length === 4 && Number.isInteger(q.c) && q.e) {
    const mismatch = checkExplanationMismatch(q.q, q.o, q.c, q.e);
    if (mismatch) errors.push(`C7: answer-mismatch — ${mismatch} (idx ${idx})`);
  }

  // Warnings
  if (q.q && q.q.length < 15) warnings.push(`W3: short q (${q.q.length} chars, idx ${idx})`);
  if (q.e && q.e.length > 0 && q.e.length < 20) warnings.push(`W4: short explanation (idx ${idx})`);

  return { valid: errors.length === 0, errors, warnings };
}

function validateMultipleQuestion(q, idx) {
  const errors = [];
  const warnings = [];

  if (!q.q || q.q.trim().length <= 5) errors.push(`MC1: q empty or <= 5 chars (idx ${idx})`);
  if (!Array.isArray(q.o) || q.o.length !== 6) {
    errors.push(`MC2: options count != 6 (idx ${idx}, got ${q.o?.length})`);
  } else {
    for (let i = 0; i < 6; i++) {
      if (!q.o[i] || q.o[i].trim().length === 0) errors.push(`MC3: option[${i}] empty (idx ${idx})`);
    }
    const trimmed = q.o.map(o => (o || '').trim().toLowerCase());
    if (new Set(trimmed).size < 6) errors.push(`MC6: duplicate options (idx ${idx})`);
  }
  if (!Array.isArray(q.correct_indices) || q.correct_indices.length < 2 || q.correct_indices.length > 3) {
    errors.push(`MC4: correct_indices must have 2-3 items (idx ${idx}, got ${JSON.stringify(q.correct_indices)})`);
  } else if (Array.isArray(q.o)) {
    for (const ci of q.correct_indices) {
      if (ci < 0 || ci >= q.o.length) errors.push(`MC5: correct_indices[${ci}] out of range (idx ${idx})`);
    }
  }
  if (!q.e || q.e.trim().length <= 10) {
    errors.push(`MC7: explanation <= 10 chars (idx ${idx})`);
  } else {
    // Check weak explanations (same patterns as single-choice)
    const eTrim = q.e.trim();
    if (/^Правильный ответ/i.test(eTrim) && eTrim.length < 60) {
      warnings.push(`MW2: explanation may be uninformative (idx ${idx})`);
    }
    // Check that explanation mentions at least one correct option
    if (Array.isArray(q.correct_indices) && q.correct_indices.length >= 2 && Array.isArray(q.o)) {
      const eLower = eTrim.toLowerCase();
      const mentionsAny = q.correct_indices.some(ci => {
        const opt = (q.o[ci] || '').toLowerCase().trim();
        return opt.length >= 3 && eLower.includes(opt);
      });
      if (!mentionsAny) {
        warnings.push(`MW3: explanation doesn't mention any correct option (idx ${idx})`);
      }
    }
  }
  if (q.q && q.q.length < 15) warnings.push(`MW1: short q (${q.q.length} chars, idx ${idx})`);

  return { valid: errors.length === 0, errors, warnings };
}

function validateMatchingQuestion(q, idx) {
  const errors = [];
  const warnings = [];

  if (!q.q || q.q.trim().length <= 5) errors.push(`MT1: q empty or <= 5 chars (idx ${idx})`);
  if (!Array.isArray(q.pairs) || q.pairs.length !== 5) {
    errors.push(`MT2: pairs must have 5 items (idx ${idx}, got ${q.pairs?.length})`);
  } else {
    for (let i = 0; i < q.pairs.length; i++) {
      if (!Array.isArray(q.pairs[i]) || q.pairs[i].length !== 2) {
        errors.push(`MT3: pair[${i}] invalid (idx ${idx})`);
      } else {
        if (!q.pairs[i][0] || !q.pairs[i][1]) errors.push(`MT4: pair[${i}] has empty side (idx ${idx})`);
      }
    }
    const lefts = q.pairs.filter(p => Array.isArray(p) && p.length === 2).map(p => (p[0] || '').trim().toLowerCase());
    const rights = q.pairs.filter(p => Array.isArray(p) && p.length === 2).map(p => (p[1] || '').trim().toLowerCase());
    if (new Set(lefts).size < lefts.length) errors.push(`MT5: duplicate left sides (idx ${idx})`);
    if (new Set(rights).size < rights.length) errors.push(`MT6: duplicate right sides (idx ${idx})`);
  }
  if (!q.e || q.e.trim().length <= 10) {
    errors.push(`MT7: explanation <= 10 chars (idx ${idx})`);
  } else {
    // Weak explanation check
    const eTrim = q.e.trim();
    if (/^Правильный ответ/i.test(eTrim) && eTrim.length < 60) {
      warnings.push(`MTW2: explanation may be uninformative (idx ${idx})`);
    }
  }

  // Self-answer: question text contains pair values
  if (q.q && Array.isArray(q.pairs) && q.pairs.length === 5) {
    const qLower = q.q.toLowerCase();
    const allValues = q.pairs.flat().filter(v => v && v.length >= 4);
    const matchCount = allValues.filter(v => qLower.includes(v.toLowerCase())).length;
    if (matchCount >= 4) {
      warnings.push(`MTW3: question contains ${matchCount}/${allValues.length} pair values (idx ${idx})`);
    }
  }

  // Short pair values
  if (Array.isArray(q.pairs)) {
    for (let i = 0; i < q.pairs.length; i++) {
      if (Array.isArray(q.pairs[i]) && q.pairs[i].length === 2) {
        if (q.pairs[i][0] && q.pairs[i][0].trim().length < 2) warnings.push(`MTW4: pair[${i}] left too short (idx ${idx})`);
        if (q.pairs[i][1] && q.pairs[i][1].trim().length < 2) warnings.push(`MTW5: pair[${i}] right too short (idx ${idx})`);
      }
    }
  }

  if (q.q && q.q.length < 15) warnings.push(`MTW1: short q (${q.q.length} chars, idx ${idx})`);

  return { valid: errors.length === 0, errors, warnings };
}

function validateContextQuestion(q, idx) {
  const errors = [];
  const warnings = [];

  // Context = single question with passage
  const base = validateQuestion(q, idx);
  errors.push(...base.errors);
  warnings.push(...base.warnings);

  if (!q.passage_text || q.passage_text.trim().length < 50) {
    errors.push(`CX1: passage_text too short or missing (idx ${idx})`);
  }
  if (!q.passage_title || q.passage_title.trim().length < 3) {
    errors.push(`CX2: passage_title missing (idx ${idx})`);
  }

  return { valid: errors.length === 0, errors, warnings };
}

function validateByType(q, idx, type) {
  if (type === 'multiple') return validateMultipleQuestion(q, idx);
  if (type === 'matching') return validateMatchingQuestion(q, idx);
  if (type === 'context') return validateContextQuestion(q, idx);
  return validateQuestion(q, idx);
}

function validatePassage(p, idx) {
  const errors = [];
  const warnings = [];

  // R3: title non-empty
  if (!p.t || p.t.trim().length === 0) errors.push(`R3: passage ${idx} title empty`);
  // R4: text > 50 chars
  if (!p.tx || p.tx.length <= 50) errors.push(`R4: passage ${idx} text <= 50 chars`);
  // R2: 5 questions per passage
  if (!p.qs || p.qs.length !== 5) errors.push(`R2: passage ${idx} has ${p.qs?.length} questions (expected 5)`);

  // Validate each question in the passage
  if (p.qs) {
    for (let qi = 0; qi < p.qs.length; qi++) {
      const r = validateQuestion(p.qs[qi], `${idx}.${qi}`);
      errors.push(...r.errors);
      warnings.push(...r.warnings);
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}

// ── Section 5: Deduplication ────────────────────────────────────────────────

function tokenize(text) {
  return (text || '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, '')
    .split(/\s+/)
    .filter(w => w.length > 2);
}

function jaccard(setA, setB) {
  if (setA.size === 0 && setB.size === 0) return 1;
  let intersection = 0;
  for (const item of setA) {
    if (setB.has(item)) intersection++;
  }
  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

// JACCARD_THRESHOLD imported from ./utils/constants.mjs

async function loadExistingPool(subject) {
  // Try Supabase first (has all generated questions), fallback to static files
  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY) {
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
      const { data, error } = await sb
        .from('questions')
        .select('idx,topic,q,o,c,e,passage_group,passage_title,passage_text,type')
        .eq('subject', subject)
        .order('idx', { ascending: true });

      if (!error && data && data.length > 0) {
        const reg = SUBJECT_REGISTRY[subject];
        if (reg.isReading) {
          return data.map(r => ({
            q: r.q, o: r.o, c: r.c, e: r.e || '',
            _passageTitle: r.passage_title || '',
            _passageText: r.passage_text || '',
            _passageGroup: r.passage_group,
            _topic: r.topic,
          }));
        }
        return data.map(r => ({
          q: r.q, o: r.o, c: r.c, e: r.e || '',
          _topic: r.topic,
          _type: r.type || 'single',
        }));
      }
    } catch (e) {
      console.warn(`  Warning: Supabase load failed, falling back to static: ${e.message}`);
    }
  }

  // Fallback to static files
  const reg = SUBJECT_REGISTRY[subject];
  const filePath = join(srcDir, reg.file);
  if (!existsSync(filePath)) return [];

  try {
    const mod = await import(toURL(filePath));
    const arr = mod[reg.exp];
    if (reg.isReading) {
      return arr.flatMap(p => p.qs.map(q => ({ ...q, _passageTitle: p.t })));
    }
    return arr || [];
  } catch (e) {
    console.warn(`  Warning: could not load existing pool for ${subject}: ${e.message}`);
    return [];
  }
}

function deduplicate(newQuestions, existingQuestions, isReading) {
  const existingTokenSets = existingQuestions.map(q => new Set(tokenize(q.q)));
  const kept = [];
  const dupes = [];

  // Build token sets for kept items to do intra-batch dedup
  const keptTokenSets = [];

  for (const q of newQuestions) {
    const qTokens = new Set(tokenize(q.q));

    // Check against existing pool
    let isDupe = false;
    for (const existSet of existingTokenSets) {
      if (jaccard(qTokens, existSet) >= JACCARD_THRESHOLD) {
        isDupe = true;
        break;
      }
    }

    // Check intra-batch
    if (!isDupe) {
      for (const keptSet of keptTokenSets) {
        if (jaccard(qTokens, keptSet) >= JACCARD_THRESHOLD) {
          isDupe = true;
          break;
        }
      }
    }

    if (isDupe) {
      dupes.push(q);
    } else {
      kept.push(q);
      keptTokenSets.push(qTokens);
    }
  }

  return { kept, dupes };
}

function deduplicatePassages(newPassages, existingQuestions) {
  // For reading: compare passage title+text as the dedup unit
  const existingPassageSets = [];
  // Group existing by passage title + text snippet (title alone is too short for reliable dedup)
  const seenTitles = new Set();
  for (const q of existingQuestions) {
    if (q._passageTitle && !seenTitles.has(q._passageTitle)) {
      seenTitles.add(q._passageTitle);
      const passageSignature = q._passageTitle + ' ' + (q._passageText || '').slice(0, 200);
      existingPassageSets.push(new Set(tokenize(passageSignature)));
    }
  }

  const kept = [];
  const dupes = [];
  const keptTitleSets = [];

  for (const p of newPassages) {
    const passageSignature = p.t + ' ' + (p.tx || '').slice(0, 200);
    const titleTokens = new Set(tokenize(passageSignature));
    let isDupe = false;

    for (const existSet of existingPassageSets) {
      if (jaccard(titleTokens, existSet) >= JACCARD_THRESHOLD) {
        isDupe = true;
        break;
      }
    }
    if (!isDupe) {
      for (const keptSet of keptTitleSets) {
        if (jaccard(titleTokens, keptSet) >= JACCARD_THRESHOLD) {
          isDupe = true;
          break;
        }
      }
    }

    if (isDupe) {
      dupes.push(p);
    } else {
      kept.push(p);
      keptTitleSets.push(titleTokens);
    }
  }

  return { kept, dupes };
}

// ── Section 6: C-distribution balancer ──────────────────────────────────────

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function cDistribution(questions) {
  const dist = [0, 0, 0, 0];
  for (const q of questions) dist[q.c]++;
  return dist;
}

function shuffleQuestionOptions(q) {
  const correctText = q.o[q.c];
  const shuffled = shuffle(q.o);
  const newC = shuffled.indexOf(correctText);
  return { ...q, o: shuffled, c: newC };
}

function balanceCDistribution(questions) {
  const MAX_ATTEMPTS = 30;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const balanced = questions.map(q => shuffleQuestionOptions(q));
    const dist = cDistribution(balanced);
    const total = balanced.length;
    if (total === 0) return balanced;
    const maxPct = Math.max(...dist) / total * 100;
    if (maxPct <= 35) return balanced;
  }
  // Fallback: return shuffled anyway
  return questions.map(q => shuffleQuestionOptions(q));
}

function balancePassages(passages) {
  const MAX_ATTEMPTS = 30;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const balanced = passages.map(p => ({
      ...p,
      qs: p.qs.map(q => shuffleQuestionOptions(q)),
    }));
    const allQs = balanced.flatMap(p => p.qs);
    const dist = cDistribution(allQs);
    const total = allQs.length;
    if (total === 0) return balanced;
    const maxPct = Math.max(...dist) / total * 100;
    if (maxPct <= 35) return balanced;
  }
  return passages.map(p => ({ ...p, qs: p.qs.map(q => shuffleQuestionOptions(q)) }));
}

// ── Section 7: OpenAI generation engine ─────────────────────────────────────

// SUBJECT_NAMES imported from ./utils/constants.mjs

function pickRandomSamples(pool, count) {
  const shuffled = shuffle([...pool]);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

function formatExamplesBlock(examples) {
  if (!examples || examples.length === 0) return '';
  const lines = examples.map((q, i) => {
    const opts = q.o.map((o, j) => `${j === q.c ? '*' : ' '} ${o}`).join(' | ');
    return `${i + 1}. "${q.q}" → [${opts}]`;
  });
  return `\n\nВот примеры существующих вопросов для ориентира по стилю и сложности:
${lines.join('\n')}

Сгенерируй НОВЫЕ вопросы. НЕ повторяй примеры. Используй другие сценарии, числа, формулировки.`;
}

// QUALITY_RULES imported from ./utils/constants.mjs
// Extra examples appended to the shared rules in prompts below
const QUALITY_EXAMPLES = `

ПРИМЕРЫ ПЛОХИХ ВОПРОСОВ (так НЕ делай):
- "Столица Казахстана?" — слишком просто, факт общеизвестен
- "Элемент с атомным номером 1?" — тривиально
- "Основоположник квантовой механики Макс Планк предложил..." — ответ в вопросе

ПРИМЕРЫ ХОРОШИХ ВОПРОСОВ:
- "При каком значении pH раствор аммиака проявляет буферные свойства?"
- "Какой процесс объясняет увеличение сопротивления металла при нагревании?"
- "В каком из вариантов правильно указана последовательность этапов митоза?"`;

// ── Difficulty instruction block ─────────────────────────────────────────────
const DIFFICULTY_INSTRUCTIONS = {
  easy: `\nУРОВЕНЬ СЛОЖНОСТИ: ЛЁГКИЙ
- Базовые знания и определения, простое понимание темы
- Вопросы из первой трети теста (разминочные)
- Прямое применение одного правила или формулы
- Минимум вычислений, простые числа
- Один шаг рассуждения
- НО: вопросы всё равно НЕ тривиальные — они требуют знания предмета, просто не требуют сложного анализа`,
  medium: `\nУРОВЕНЬ СЛОЖНОСТИ: СРЕДНИЙ
- Применение знаний, анализ, установление связей между понятиями
- Вопросы из средней части теста
- Требуется 2-3 шага рассуждения
- Применение формулы с преобразованием или подстановкой
- Сравнение, классификация, определение закономерностей`,
  hard: `\nУРОВЕНЬ СЛОЖНОСТИ: СЛОЖНЫЙ
- Глубокий анализ, синтез нескольких тем, нестандартные задачи
- Вопросы из последней четверти теста
- Многошаговые рассуждения (3+ шага)
- Комбинирование знаний из разных разделов
- Ловушки с похожими вариантами ответов
- Задачи на вывод, критическое мышление, олимпиадный стиль`,
};

function getDifficultyBlock(difficulty) {
  return difficulty ? (DIFFICULTY_INSTRUCTIONS[difficulty] || '') : '';
}

// getSTEMPrefix, getTemperature imported from ./utils/constants.mjs

function buildRegularPrompt(subject, topic, count, referenceExamples, difficulty, subtopic) {
  const subjectName = SUBJECT_NAMES[subject] || subject;
  const topicHint = getSpecContext(subject, topic, subtopic);
  const examplesBlock = formatExamplesBlock(referenceExamples);
  const difficultyBlock = getDifficultyBlock(difficulty);
  const difficultyField = difficulty ? `,"difficulty":"${difficulty}"` : '';

  return {
    system: `Ты эксперт по созданию вопросов для ЕНТ (Единое национальное тестирование, Казахстан).
Предмет: ${subjectName}${topicHint}${difficultyBlock}${getSTEMPrefix(subject)}

Правила формата:
1. Все тексты на РУССКОМ языке
2. Ровно 4 варианта ответа, без буквенных префиксов (А, Б, В, Г)
3. Все 4 варианта должны быть правдоподобными и примерно одинаковой длины
4. Правильный ответ (c) — индекс от 0 до 3, распределяй РАВНОМЕРНО
5. НЕ добавляй подсказки в скобках — "(правильный)", "(основатель)" и т.п.
6. Каждый вопрос УНИКАЛЕН — не повторяй формулировки
7. Объяснение (e) — 1-3 предложения, образовательное, простым языком
8. Ответ строго в формате JSON
${QUALITY_RULES}${QUALITY_EXAMPLES}

Верни JSON: {"questions":[{"q":"текст вопроса","o":["вариант1","вариант2","вариант3","вариант4"],"c":0,"e":"объяснение"${difficultyField}}]}`,
    user: `Сгенерируй ${count} вопросов для ЕНТ по предмету "${subjectName}"${topicHint}. Вопросы должны требовать знаний и анализа, а НЕ простого запоминания фактов.${examplesBlock}`,
  };
}

function buildRephrasePrompt(subject, questionsToRephrase) {
  const subjectName = SUBJECT_NAMES[subject] || subject;
  // Do NOT include correct answer index (c) — AI must determine it independently to avoid bias
  const qList = questionsToRephrase.map((q, i) => {
    const esc = (s) => (s || '').replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    return `${i + 1}. {"q":"${esc(q.q)}","o":${JSON.stringify(q.o)},"e":"${esc(q.e)}"}`;
  }).join('\n');

  return {
    system: `Ты эксперт по созданию вопросов для ЕНТ (Единое национальное тестирование, Казахстан).
Предмет: ${subjectName}${getSTEMPrefix(subject)}

Задача: ПЕРЕФРАЗИРУЙ каждый вопрос ниже. Для каждого вопроса:
- Измени числа, данные, контекст и формулировку
- Сохрани тему, уровень сложности и тип вопроса
- Создай новые варианты ответа (не копируй старые)
- САМОСТОЯТЕЛЬНО определи правильный ответ — реши задачу заново
- Обнови объяснение под новые данные
- Правильный ответ (c) — индекс 0-3, распределяй равномерно
- НЕ добавляй подсказки в скобках

Правила:
1. Все тексты на РУССКОМ языке
2. Ровно 4 варианта ответа, без буквенных префиксов
3. Результат должен быть СУЩЕСТВЕННО отличающимся от оригинала
4. Ответ строго в формате JSON

Верни JSON: {"questions":[{"q":"текст вопроса","o":["вариант1","вариант2","вариант3","вариант4"],"c":0,"e":"объяснение"}]}`,
    user: `Перефразируй следующие ${questionsToRephrase.length} вопросов. Измени числа, контекст и формулировку, сохраняя тему и сложность. Определи правильный ответ САМОСТОЯТЕЛЬНО:\n\n${qList}`,
  };
}

function buildReadingRephrasePrompt(passagesToRephrase) {
  const pList = passagesToRephrase.map((p, i) => {
    return `Пассаж ${i + 1}: "${p.t}" — тема текста о ${p.tx.slice(0, 80)}...`;
  }).join('\n');

  return {
    system: `Ты эксперт по созданию текстов и вопросов для раздела "Грамотность чтения" ЕНТ (Казахстан).

Задача: Создай НОВЫЕ пассажи на основе тем ниже. Для каждого:
- Напиши НОВЫЙ текст на ту же тему, но с другим углом/фокусом
- Создай 5 НОВЫХ вопросов на понимание прочитанного
- Используй другую структуру и факты

Правила:
1. Все тексты на РУССКОМ языке
2. Каждый пассаж: заголовок (t), текст (tx) 100-200 слов, 5 вопросов (qs)
3. Ровно 4 варианта ответа, без буквенных префиксов
4. c — индекс правильного ответа (0-3), распределяй равномерно
5. Объяснение — 1-2 предложения
6. НЕ добавляй подсказки в скобках
7. Ответ строго в формате JSON

Верни JSON: {"passages":[{"t":"заголовок","tx":"текст пассажа...","qs":[{"q":"вопрос","o":["A","B","C","D"],"c":0,"e":"объяснение"},... ещё 4 вопроса]}]}`,
    user: `Создай ${passagesToRephrase.length} НОВЫХ пассажей, вдохновляясь темами:\n\n${pList}\n\nНе копируй тексты — напиши полностью новые, с другим фокусом.`,
  };
}

function buildReadingPrompt(count) {
  return {
    system: `Ты эксперт по созданию текстов и вопросов для раздела "Грамотность чтения" ЕНТ (Казахстан).

Правила формата:
1. Все тексты на РУССКОМ языке
2. Каждый пассаж: заголовок (t), текст (tx) 100-200 слов, 5 вопросов (qs)
3. Тематика текстов: Казахстан, наука, культура, экология, технологии, общество
4. Ровно 4 варианта ответа, без буквенных префиксов
5. Все варианты правдоподобные и примерно одинаковой длины
6. c — индекс правильного ответа (0-3), распределяй равномерно
7. Объяснение — 1-2 предложения
8. НЕ добавляй подсказки в скобках
9. Ответ строго в формате JSON

Правила качества:
- Вопросы должны проверять ГЛУБОКОЕ понимание: выводы, причинно-следственные связи, авторскую позицию
- ЗАПРЕЩЕНЫ вопросы где ответ БУКВАЛЬНО написан в тексте одним предложением
- Минимум 2 из 5 вопросов — на ВЫВОД или ИНТЕРПРЕТАЦИЮ (не нахождение информации)
- Дистракторы должны быть из той же предметной области и звучать правдоподобно
- Текст должен быть достаточно сложным для анализа, НЕ примитивные факты
${QUALITY_RULES}${QUALITY_EXAMPLES}

Верни JSON: {"passages":[{"t":"заголовок","tx":"текст пассажа...","qs":[{"q":"вопрос","o":["A","B","C","D"],"c":0,"e":"объяснение"},... ещё 4 вопроса]}]}`,
    user: `Сгенерируй ${count} пассажей для раздела "Грамотность чтения" ЕНТ. Вопросы на АНАЛИЗ и ВЫВОДЫ, а НЕ на прямое нахождение ответа в тексте.`,
  };
}

// ── Prompts for new question types ──────────────────────────────────────────

function buildMultiplePrompt(subject, topic, count, referenceExamples, difficulty, subtopic) {
  const subjectName = SUBJECT_NAMES[subject] || subject;
  const topicHint = getSpecContext(subject, topic, subtopic);
  const examplesBlock = formatExamplesBlock(referenceExamples);
  const difficultyBlock = getDifficultyBlock(difficulty);

  return {
    system: `Ты эксперт по созданию вопросов для ЕНТ (Единое национальное тестирование, Казахстан).
Предмет: ${subjectName}${topicHint}${difficultyBlock}${getSTEMPrefix(subject)}

Тип: МНОЖЕСТВЕННЫЙ ВЫБОР — вопрос с НЕСКОЛЬКИМИ правильными ответами.

ЖЁСТКИЕ ПРАВИЛА (нарушение = отклонение вопроса):
1. Все тексты на РУССКОМ языке, уровень ЕНТ (11 класс)
2. Ровно 6 вариантов ответа, без буквенных префиксов (А), Б) и т.д.)
3. СТРОГО 2 или 3 правильных ответа — НЕ МЕНЬШЕ 2 и НЕ БОЛЬШЕ 3
4. correct_indices — массив из 2 или 3 чисел (0-5), это индексы правильных вариантов
5. 3 или 4 варианта должны быть НЕПРАВИЛЬНЫМИ (правдоподобные дистракторы)
6. Все 6 вариантов примерно одинаковой длины
7. НЕ добавляй подсказки в скобках
8. Объяснение (e) — 2-3 предложения, ПЕРЕЧИСЛИ все правильные ответы и ПОЧЕМУ они верны
9. Формулировка вопроса: "Какие из утверждений верны?" / "Укажите все правильные ответы"
10. Ответ строго JSON, никакого текста до или после
${QUALITY_RULES}${QUALITY_EXAMPLES}

ПРИМЕР с 2 правильными (индексы 0 и 3):
{"q":"Какие из веществ являются электролитами?","o":["Хлорид натрия","Глюкоза","Этанол","Серная кислота","Бензол","Метан"],"correct_indices":[0,3],"e":"NaCl и H₂SO₄ диссоциируют в воде на ионы — это электролиты. Остальные — неэлектролиты."}

Верни JSON: {"questions":[...]}
Каждый вопрос: {"q":"...","o":["v1","v2","v3","v4","v5","v6"],"correct_indices":[i,j],"e":"..."}`,
    user: `Сгенерируй ${count} вопросов МНОЖЕСТВЕННОГО ВЫБОРА для ЕНТ по предмету "${subjectName}"${topicHint}. Каждый вопрос — 6 вариантов, 2-3 правильных. Вопросы должны требовать глубоких знаний.${examplesBlock}`,
  };
}

function buildMatchingPrompt(subject, topic, count, referenceExamples, difficulty, subtopic) {
  const subjectName = SUBJECT_NAMES[subject] || subject;
  const topicHint = getSpecContext(subject, topic, subtopic);
  const difficultyBlock = getDifficultyBlock(difficulty);

  return {
    system: `Ты эксперт по созданию вопросов для ЕНТ (Единое национальное тестирование, Казахстан).
Предмет: ${subjectName}${topicHint}${difficultyBlock}${getSTEMPrefix(subject)}

Тип: СООТВЕТСТВИЕ — установите соответствие между элементами двух столбцов.

Правила формата:
1. Все тексты на РУССКОМ языке, уровень ЕНТ (11 класс)
2. Ровно 5 пар [левый элемент, правый элемент]
3. Каждый левый элемент ОДНОЗНАЧНО соответствует одному правому
4. Левые и правые элементы не повторяются
5. НЕ добавляй подсказки в скобках
6. Объяснение (e) — 2-4 предложения, объясни КАЖДУЮ пару и почему они связаны
7. Формулировка вопроса: "Установите соответствие между..." или "Сопоставьте..."
8. Ответ строго в формате JSON

Правила качества:
- Пары НЕ должны быть очевидными (не "Россия — Москва")
- Правые элементы должны быть достаточно похожими, чтобы перепутать без глубоких знаний
- Используй тонкие различия: формулы vs формулы, даты vs даты, процессы vs процессы
- ЗАПРЕЩЕНЫ пары где связь очевидна из формулировки (напр. "фотосинтез — свет")
${QUALITY_RULES}${QUALITY_EXAMPLES}

Верни JSON: {"questions":[{"q":"текст задания","pairs":[["левый1","правый1"],["левый2","правый2"],["левый3","правый3"],["левый4","правый4"],["левый5","правый5"]],"e":"объяснение"}]}`,
    user: `Сгенерируй ${count} СЛОЖНЫХ вопросов на СООТВЕТСТВИЕ для ЕНТ по предмету "${subjectName}"${topicHint}. Пары должны быть НЕочевидными и требовать глубоких знаний.`,
  };
}

function buildContextPrompt(subject, topic, count, difficulty, subtopic) {
  const subjectName = SUBJECT_NAMES[subject] || subject;
  const topicHint = getSpecContext(subject, topic, subtopic);
  const difficultyBlock = getDifficultyBlock(difficulty);

  return {
    system: `Ты эксперт по созданию вопросов для ЕНТ (Единое национальное тестирование, Казахстан).
Предмет: ${subjectName}${topicHint}${difficultyBlock}${getSTEMPrefix(subject)}

Тип: КОНТЕКСТНЫЕ ВОПРОСЫ — текстовый отрывок + вопросы на понимание и анализ.

Правила формата:
1. Все тексты на РУССКОМ языке, уровень ЕНТ (11 класс)
2. Каждый блок: заголовок (passage_title), текст (passage_text) 3-8 предложений, и 1 вопрос
3. Текст должен быть ФАКТИЧЕСКИ ВЕРНЫМ и АКТУАЛЬНЫМ
4. Ровно 4 варианта ответа, без буквенных префиксов
5. c — индекс правильного ответа (0-3), распределяй РАВНОМЕРНО
6. Объяснение (e) — 1-3 предложения, ссылка на текст
7. НЕ добавляй подсказки в скобках
8. Ответ строго в формате JSON

Правила качества:
- Вопрос ТРЕБУЕТ ГЛУБОКОГО АНАЛИЗА текста, а НЕ простого нахождения ответа в тексте
- ЗАПРЕЩЕНЫ вопросы "О чём говорится в тексте?" или "Что упомянуто в отрывке?" если ответ лежит на поверхности
- Вопрос должен требовать ВЫВОДА, ОБОБЩЕНИЯ или СРАВНЕНИЯ на основе текста
- Текст НЕ должен содержать прямой ответ на вопрос — ученик должен СДЕЛАТЬ ВЫВОД
- Дистракторы должны быть правдоподобны в контексте отрывка
${QUALITY_RULES}${QUALITY_EXAMPLES}

Верни JSON: {"questions":[{"q":"вопрос","o":["вар1","вар2","вар3","вар4"],"c":0,"e":"объяснение","passage_title":"заголовок","passage_text":"текст отрывка..."}]}`,
    user: `Сгенерируй ${count} СЛОЖНЫХ КОНТЕКСТНЫХ вопросов для ЕНТ по предмету "${subjectName}"${topicHint}. Вопросы на АНАЛИЗ и ВЫВОДЫ, а НЕ на поиск прямого ответа в тексте.`,
  };
}

async function callOpenAI(systemPrompt, userPrompt, model, temperature = 0.8) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 4096,
      temperature,
      response_format: { type: 'json_object' },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI API error (${res.status}): ${err}`);
  }

  const data = await res.json();
  const raw = data.choices?.[0]?.message?.content?.trim();
  if (!raw) throw new Error('Empty response from OpenAI');
  return raw;
}

async function callAnthropic(systemPrompt, userPrompt, model, temperature = 0.8) {
  const resolved = resolveModel(model);
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: resolved,
      max_tokens: 8192,
      temperature,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Anthropic API error (${res.status}): ${err}`);
  }

  const data = await res.json();
  const raw = data.content?.[0]?.text?.trim();
  if (!raw) throw new Error('Empty response from Anthropic');

  // Claude may wrap JSON in markdown code blocks — extract robustly
  return extractJSON(raw);
}

// extractJSON imported from ./utils/json.mjs

async function callAI(systemPrompt, userPrompt, model, temperature = 0.8) {
  const rawStr = isAnthropicModel(model)
    ? await callAnthropic(systemPrompt, userPrompt, model, temperature)
    : await callOpenAI(systemPrompt, userPrompt, model, temperature);

  if (process.env.DEBUG) console.log('\n  [DEBUG] Raw AI response:\n' + (typeof rawStr === 'string' ? rawStr : JSON.stringify(rawStr)) + '\n');

  // callAnthropic now returns parsed object via extractJSON
  if (typeof rawStr === 'object') return rawStr;
  return JSON.parse(rawStr);
}

async function generateWithRetries(systemPrompt, userPrompt, model, maxRetries = 4, temperature = 0.8) {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await callAI(systemPrompt, userPrompt, model, temperature);
    } catch (e) {
      if (attempt < maxRetries) {
        const isRateLimit = e.message.includes('429') || e.message.includes('rate_limit');
        const waitSec = isRateLimit ? 30 + attempt * 20 : 3 + attempt * 2;
        console.log(`  Retry ${attempt + 1}/${maxRetries} in ${waitSec}s — ${isRateLimit ? 'rate limit' : e.message.slice(0, 80)}`);
        await sleep(waitSec * 1000);
      } else {
        throw e;
      }
    }
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function getTopicDistribution(subject, count) {
  const TOPIC_MAP = loadTopicMap();
  const topics = TOPIC_MAP[subject];
  if (!topics) return [{ topic: null, count }];

  // Calculate total question slots across all topics
  let totalSlots = 0;
  for (const t of topics) {
    for (const [start, end] of t.ranges) {
      totalSlots += end - start + 1;
    }
  }

  // Distribute proportionally
  const distribution = [];
  let assigned = 0;
  for (let i = 0; i < topics.length; i++) {
    let topicSlots = 0;
    for (const [start, end] of topics[i].ranges) {
      topicSlots += end - start + 1;
    }
    const share = i === topics.length - 1
      ? count - assigned
      : Math.round((topicSlots / totalSlots) * count);
    if (share > 0) {
      distribution.push({ topic: topics[i].id, count: share });
      assigned += share;
    }
  }

  return distribution;
}

function buildPromptForType(type, subject, topic, count, referenceExamples, difficulty, subtopic) {
  if (type === 'multiple') return buildMultiplePrompt(subject, topic, count, referenceExamples, difficulty, subtopic);
  if (type === 'matching') return buildMatchingPrompt(subject, topic, count, referenceExamples, difficulty, subtopic);
  if (type === 'context') return buildContextPrompt(subject, topic, count, difficulty, subtopic);
  return buildRegularPrompt(subject, topic, count, referenceExamples, difficulty, subtopic);
}

async function generateQuestions(opts, existingPool) {
  const { subject, topic, subtopic, count, model, type, difficulty } = opts;
  const isReading = SUBJECT_REGISTRY[subject].isReading;
  const temp = getTemperature(subject);

  if (isReading) {
    // For reading: count = number of passages, batch by 3
    const BATCH_SIZE = 3;
    const allPassages = [];
    for (let offset = 0; offset < count; offset += BATCH_SIZE) {
      const batchCount = Math.min(BATCH_SIZE, count - offset);
      console.log(`  Generating passages ${offset + 1}-${offset + batchCount} of ${count}...`);
      const prompt = buildReadingPrompt(batchCount);
      const result = await generateWithRetries(prompt.system, prompt.user, model, 4, temp);
      if (result.passages) allPassages.push(...result.passages);
      if (offset + BATCH_SIZE < count) await sleep(15000);
    }
    return { passages: allPassages };
  }

  // Regular subjects — pick reference examples from existing pool
  const BATCH_SIZE = 15;
  const REF_EXAMPLES = 3;
  const allQuestions = [];

  // If topic specified, generate all for that topic
  if (topic) {
    const topicExamples = existingPool.filter(q => q._topic === topic);
    const refPool = topicExamples.length >= REF_EXAMPLES ? topicExamples : existingPool;
    for (let offset = 0; offset < count; offset += BATCH_SIZE) {
      const batchCount = Math.min(BATCH_SIZE, count - offset);
      const stLabel = subtopic ? ` subtopic: ${subtopic}` : '';
      console.log(`  Generating questions ${offset + 1}-${offset + batchCount} of ${count} (topic: ${topic}${stLabel})...`);
      const refs = pickRandomSamples(refPool, REF_EXAMPLES);
      const prompt = buildPromptForType(type, subject, topic, batchCount, refs, difficulty, subtopic);
      const result = await generateWithRetries(prompt.system, prompt.user, model, 4, temp);
      if (result.questions) {
        // Tag difficulty and subtopic on each question
        for (const q of result.questions) {
          if (difficulty) q._difficulty = difficulty;
          if (subtopic) q._subtopic = subtopic;
        }
        allQuestions.push(...result.questions);
      }
      if (offset + BATCH_SIZE < count) await sleep(15000);
    }
  } else {
    // Distribute across topics
    const distribution = await getTopicDistribution(subject, count);
    for (const { topic: t, count: tCount } of distribution) {
      const topicExamples = t ? existingPool.filter(q => q._topic === t) : existingPool;
      const refPool = topicExamples.length >= REF_EXAMPLES ? topicExamples : existingPool;
      for (let offset = 0; offset < tCount; offset += BATCH_SIZE) {
        const batchCount = Math.min(BATCH_SIZE, tCount - offset);
        const topicLabel = t || 'general';
        console.log(`  Generating ${batchCount} questions (topic: ${topicLabel}, difficulty: ${difficulty || 'mixed'})...`);
        const refs = pickRandomSamples(refPool, REF_EXAMPLES);
        const prompt = buildPromptForType(type, subject, t, batchCount, refs, difficulty);
        const result = await generateWithRetries(prompt.system, prompt.user, model, 4, temp);
        if (result.questions) {
          // Tag each question with its topic and difficulty
          for (const q of result.questions) {
            q._topic = t;
            if (difficulty) q._difficulty = difficulty;
          }
          allQuestions.push(...result.questions);
        }
        await sleep(15000);
      }
    }
  }

  return { questions: allQuestions };
}

async function rephraseQuestions(opts, existingPool) {
  const { subject, count, model } = opts;
  const isReading = SUBJECT_REGISTRY[subject].isReading;
  const temp = getTemperature(subject);

  // Rephrase only supports single-choice (prompt format doesn't handle multiple/matching)
  if (opts.type && opts.type !== 'single' && !isReading) {
    fail(`--rephrase only supports --type=single (got ${opts.type}). Multiple/matching require different prompt structure.`);
  }

  if (existingPool.length === 0) {
    fail(`No existing questions found for ${subject} — cannot rephrase`);
  }

  if (isReading) {
    // Rephrase reading passages
    // existingPool is flat questions with _passageTitle/_passageText; reconstruct passages
    const passageMap = new Map();
    for (const q of existingPool) {
      const key = q._passageTitle || q._passageGroup?.toString() || 'unknown';
      if (!passageMap.has(key)) passageMap.set(key, { t: q._passageTitle || key, tx: q._passageText || '', qs: [] });
      passageMap.get(key).qs.push({ q: q.q, o: q.o, c: q.c, e: q.e });
    }
    const allPassages = [...passageMap.values()];
    const sampled = pickRandomSamples(allPassages, count);

    const BATCH_SIZE = 3;
    const result = [];
    for (let offset = 0; offset < sampled.length; offset += BATCH_SIZE) {
      const batch = sampled.slice(offset, offset + BATCH_SIZE);
      console.log(`  Rephrasing passages ${offset + 1}-${offset + batch.length} of ${sampled.length}...`);
      const prompt = buildReadingRephrasePrompt(batch);
      const res = await generateWithRetries(prompt.system, prompt.user, model, 4, temp);
      if (res.passages) result.push(...res.passages);
      if (offset + BATCH_SIZE < sampled.length) await sleep(1000);
    }
    return { passages: result };
  }

  // Regular subjects — batch rephrase (single-choice only; multiple/matching prompts differ)
  const singlePool = existingPool.filter(q => (q._type || 'single') === 'single');
  if (singlePool.length === 0) {
    fail(`No single-choice questions found for ${subject} — cannot rephrase`);
  }
  const BATCH_SIZE = 10;
  const sampled = pickRandomSamples(singlePool, count);
  const allQuestions = [];

  for (let offset = 0; offset < sampled.length; offset += BATCH_SIZE) {
    const batch = sampled.slice(offset, offset + BATCH_SIZE);
    console.log(`  Rephrasing questions ${offset + 1}-${offset + batch.length} of ${sampled.length}...`);
    const prompt = buildRephrasePrompt(subject, batch);
    const result = await generateWithRetries(prompt.system, prompt.user, model, 4, temp);
    if (result.questions) {
      // Preserve topic from originals
      for (let i = 0; i < result.questions.length; i++) {
        if (i < batch.length && batch[i]._topic) {
          result.questions[i]._topic = batch[i]._topic;
        }
      }
      allQuestions.push(...result.questions);
    }
    if (offset + BATCH_SIZE < sampled.length) await sleep(1000);
  }

  return { questions: allQuestions };
}

// ── Section 8: File output ──────────────────────────────────────────────────

function escapeForJS(str) {
  return (str || '')
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n');
}

function questionToJS(q) {
  const opts = q.o.map(o => `"${escapeForJS(o)}"`).join(',');
  return `{q:"${escapeForJS(q.q)}",o:[${opts}],c:${q.c},e:"${escapeForJS(q.e || '')}"}`;
}

function appendToRegularFile(subject, questions) {
  const reg = SUBJECT_REGISTRY[subject];
  const filePath = join(srcDir, reg.file);
  let content = readFileSync(filePath, 'utf-8');

  // Find the last `];` in the file and insert before it
  const lastClose = content.lastIndexOf('];');
  if (lastClose === -1) {
    throw new Error(`Could not find ]; in ${reg.file}`);
  }

  const newLines = questions.map(q => questionToJS(q) + ',').join('\n');
  const comment = `\n// === Generated ${new Date().toISOString().slice(0, 10)} (${questions.length}q) ===\n`;

  content = content.slice(0, lastClose) + comment + newLines + '\n' + content.slice(lastClose);
  writeFileSync(filePath, content, 'utf-8');
  return filePath;
}

function appendToReadingFile(subject, passages) {
  const reg = SUBJECT_REGISTRY[subject];
  const filePath = join(srcDir, reg.file);
  let content = readFileSync(filePath, 'utf-8');

  const lastClose = content.lastIndexOf('];');
  if (lastClose === -1) {
    throw new Error(`Could not find ]; in ${reg.file}`);
  }

  const newLines = [];
  newLines.push(`// === Generated ${new Date().toISOString().slice(0, 10)} (${passages.length} passages) ===`);
  for (const p of passages) {
    newLines.push(`{t:"${escapeForJS(p.t)}",tx:"${escapeForJS(p.tx)}",qs:[`);
    for (const q of p.qs) {
      newLines.push(questionToJS(q) + ',');
    }
    newLines.push(']},');
  }

  content = content.slice(0, lastClose) + '\n' + newLines.join('\n') + '\n' + content.slice(lastClose);
  writeFileSync(filePath, content, 'utf-8');
  return filePath;
}

// ── Section 9: Supabase output ──────────────────────────────────────────────

async function getMaxIdx(supabase, subject) {
  const { data, error } = await supabase
    .from('questions')
    .select('idx')
    .eq('subject', subject)
    .order('idx', { ascending: false })
    .limit(1);

  if (error) throw new Error(`Supabase query error: ${error.message}`);
  return data && data.length > 0 ? data[0].idx : -1;
}

async function findTopicForQuestion(subject, q) {
  // Use _topic if tagged during generation
  if (q._topic) return q._topic;

  const TOPIC_MAP = loadTopicMap();
  // Can't determine topic without index for imported questions
  return null;
}

async function outputToSupabase(subject, questions, passages, source, qType = 'single') {
  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

  let startIdx = (await getMaxIdx(supabase, subject)) + 1;
  const rows = [];
  const isReading = SUBJECT_REGISTRY[subject].isReading;

  if (isReading && passages) {
    // For reading: each passage group gets sequential indices
    for (let pi = 0; pi < passages.length; pi++) {
      const p = passages[pi];
      // Use this passage's first idx as group ID — guaranteed unique even if startIdx isn't 5-aligned
      const passageGroup = startIdx;
      for (let qi = 0; qi < p.qs.length; qi++) {
        const q = p.qs[qi];
        rows.push({
          subject,
          idx: startIdx++,
          topic: null,
          q: q.q,
          o: q.o,
          c: q.c,
          e: q.e || '',
          passage_group: passageGroup,
          passage_title: p.t,
          passage_text: p.tx,
          source,
        });
      }
    }
  } else if (questions) {
    for (const q of questions) {
      const row = {
        subject,
        idx: startIdx++,
        topic: q._topic || null,
        subtopic: q._subtopic || null,
        q: q.q,
        o: qType === 'matching' ? [] : q.o,
        // For multiple/matching, real answers live in correct_indices/pairs; c is a dummy placeholder
        c: (qType === 'multiple' || qType === 'matching') ? 0 : q.c,
        e: q.e || '',
        passage_group: null,
        passage_title: q.passage_title || null,
        passage_text: q.passage_text || null,
        source,
        type: qType === 'context' ? 'single' : qType,
        block: qType,
        difficulty: q._difficulty || null,
      };
      // Type-specific fields
      if (qType === 'multiple') {
        row.correct_indices = q.correct_indices;
      }
      if (qType === 'matching') {
        row.pairs = q.pairs;
        row.o = [];
      }
      if (qType === 'context') {
        row.type = 'single';
        row.block = 'context';
      }
      rows.push(row);
    }
  }

  // Batch insert
  const BATCH = 100;
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    const { error } = await supabase.from('questions').insert(batch);
    if (error) throw new Error(`Supabase insert error: ${error.message}`);
    console.log(`  Inserted ${Math.min(i + BATCH, rows.length)} / ${rows.length} rows`);
  }

  return rows.length;
}

// ── Section 10: Import handler ──────────────────────────────────────────────

function importFromFile(filePath, subject) {
  const raw = readFileSync(filePath, 'utf-8');
  const data = JSON.parse(raw);

  const isReading = SUBJECT_REGISTRY[subject].isReading;

  if (isReading) {
    // Expect array of passages or { passages: [...] }
    const passages = Array.isArray(data) ? data : (data.passages || []);
    return { passages };
  }

  // Expect array of questions or { questions: [...] }
  const questions = Array.isArray(data) ? data : (data.questions || []);
  return { questions };
}

// ── Section 10.5: AI Answer Verification ────────────────────────────────────

/**
 * Verify a single question's answer correctness via a second AI call.
 * The AI solves the problem independently (temperature=0 for determinism)
 * and we compare its answer with the marked correct answer.
 *
 * Returns true if the answer is confirmed correct or verification is inconclusive.
 */
async function verifyAnswer(question, subject, model) {
  const subjectName = SUBJECT_NAMES[subject] || subject;
  const optionsStr = question.o.map((o, i) => `${i}) ${o}`).join('\n');

  const systemPrompt = `Ты преподаватель предмета "${subjectName}". Реши задачу САМОСТОЯТЕЛЬНО, шаг за шагом.
После решения верни ТОЛЬКО JSON: {"answer": <индекс 0-3>, "reasoning": "краткое обоснование"}
Не угадывай — если не уверен в ответе, верни {"answer": -1, "reasoning": "не удалось определить"}`;

  const userPrompt = `Вопрос: ${question.q}

Варианты:
${optionsStr}

Реши задачу и укажи правильный ответ (индекс 0-3).`;

  const raw = await callAI(systemPrompt, userPrompt, model, 0);
  const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;

  // -1 means AI couldn't determine → fail-open (keep question)
  if (parsed.answer === -1) return true;

  const aiAnswer = typeof parsed.answer === 'number' ? parsed.answer : parseInt(parsed.answer, 10);
  if (isNaN(aiAnswer) || aiAnswer < 0 || aiAnswer > 3) return true; // inconclusive → keep

  return aiAnswer === question.c;
}

// ── Section 11: Pipeline orchestrator ───────────────────────────────────────

async function runPipeline(opts) {
  const { subject, output, mode } = opts;
  const isReading = SUBJECT_REGISTRY[subject].isReading;
  const source = mode === 'import' ? 'imported' : mode === 'rephrase' ? 'rephrased' : 'generated';

  console.log('\n=== ENTprep Question Ingestion Pipeline ===\n');
  console.log(`Subject: ${subject} | Mode: ${mode} | Type: ${opts.type} | Output: ${output}${opts.difficulty ? ` | Difficulty: ${opts.difficulty}` : ''}`);
  if (opts.topic) console.log(`Topic: ${opts.topic}${opts.subtopic ? ` | Subtopic: ${opts.subtopic}` : ''}`);
  console.log('');

  // Step 0: Load existing pool early (needed for generate refs + rephrase + dedup)
  console.log('0) Loading existing pool...');
  const existingPool = await loadExistingPool(subject);
  console.log(`   Existing pool: ${existingPool.length} questions\n`);

  // Step 1: Acquire
  console.log('1) Acquiring questions...');
  let raw;
  if (mode === 'generate') {
    raw = await generateQuestions(opts, existingPool);
  } else if (mode === 'rephrase') {
    raw = await rephraseQuestions(opts, existingPool);
  } else {
    raw = importFromFile(opts.importFile, subject);
  }

  let questions = raw.questions || null;
  let passages = raw.passages || null;
  const rawCount = isReading
    ? (passages?.length || 0) + ' passages (' + (passages?.reduce((s, p) => s + (p.qs?.length || 0), 0) || 0) + ' questions)'
    : (questions?.length || 0) + ' questions';
  console.log(`   Acquired: ${rawCount}\n`);

  // Step 2: Normalize
  console.log('2) Normalizing...');
  if (isReading && passages) {
    passages = passages.map(p => normalizePassage(p));
  } else if (questions) {
    questions = questions.map(q => normalizeQuestion(q));
  }
  console.log('   Done\n');

  // Step 3: Validate
  console.log('3) Validating...');
  let totalErrors = 0;
  let totalWarnings = 0;

  if (isReading && passages) {
    const validPassages = [];
    for (let i = 0; i < passages.length; i++) {
      const r = validatePassage(passages[i], i);
      if (r.valid) {
        validPassages.push(passages[i]);
      } else {
        console.log(`   REJECTED passage ${i}: ${r.errors.join('; ')}`);
        totalErrors += r.errors.length;
      }
      totalWarnings += r.warnings.length;
      for (const w of r.warnings) console.log(`   Warning: ${w}`);
    }
    passages = validPassages;
    console.log(`   Passed: ${passages.length} passages | Errors: ${totalErrors} | Warnings: ${totalWarnings}\n`);
  } else if (questions) {
    const validQuestions = [];
    for (let i = 0; i < questions.length; i++) {
      const r = validateByType(questions[i], i, opts.type);
      if (r.valid) {
        validQuestions.push(questions[i]);
      } else {
        console.log(`   REJECTED q[${i}]: ${r.errors.join('; ')}`);
        totalErrors += r.errors.length;
      }
      totalWarnings += r.warnings.length;
      for (const w of r.warnings) console.log(`   Warning: ${w}`);
    }
    questions = validQuestions;
    console.log(`   Passed: ${questions.length} questions | Errors: ${totalErrors} | Warnings: ${totalWarnings}\n`);
  }

  // Step 3.5: AI Answer Verification (STEM only, single/context types)
  const shouldVerify = STEM_SUBJECTS.has(subject) && !opts.skipVerify
    && (opts.type === 'single' || opts.type === 'context')
    && !isReading && questions && questions.length > 0;

  if (shouldVerify) {
    console.log('3.5) AI Answer Verification (STEM)...');
    const verified = [];
    let rejected = 0;
    let errors = 0;

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      try {
        const isCorrect = await verifyAnswer(q, subject, opts.model);
        if (isCorrect) {
          verified.push(q);
        } else {
          rejected++;
          console.log(`   REJECTED (wrong answer) q[${i}]: "${q.q.slice(0, 60)}..."`);
        }
      } catch (err) {
        // Fail-open: keep the question if verification API fails
        verified.push(q);
        errors++;
        if (process.env.DEBUG) console.log(`   Verify error q[${i}]: ${err.message.slice(0, 60)}`);
      }
      // Small delay between verification calls
      if (i < questions.length - 1) await sleep(1000);
    }
    questions = verified;
    console.log(`   Verified: ${verified.length} | Rejected: ${rejected} | API errors: ${errors}\n`);

    // Warn if too many verifications failed — unverified questions may have wrong answers
    if (errors > 0 && errors >= verified.length * 0.5) {
      console.warn(`   ⚠ WARNING: ${errors}/${errors + rejected + verified.length} verifications failed due to API errors.`);
      console.warn(`     Unverified questions were kept (fail-open). Consider re-running or manual review.\n`);
    }
  } else if (STEM_SUBJECTS.has(subject) && opts.skipVerify) {
    console.log('3.5) AI Answer Verification — SKIPPED (--skip-verify)\n');
  }

  // Step 4: Deduplicate
  console.log('4) Deduplicating against existing pool...');

  if (isReading && passages) {
    const { kept, dupes } = deduplicatePassages(passages, existingPool);
    if (dupes.length > 0) {
      console.log(`   Removed ${dupes.length} duplicate passage(s): ${dupes.map(d => d.t).join(', ')}`);
    }
    passages = kept;
    console.log(`   Kept: ${passages.length} passages\n`);
  } else if (questions) {
    const { kept, dupes } = deduplicate(questions, existingPool, false);
    if (dupes.length > 0) {
      console.log(`   Removed ${dupes.length} duplicate(s)`);
      for (const d of dupes.slice(0, 5)) console.log(`     - "${d.q.slice(0, 60)}..."`);
      if (dupes.length > 5) console.log(`     ... and ${dupes.length - 5} more`);
    }
    questions = kept;
    console.log(`   Kept: ${questions.length} questions\n`);
  }

  // Step 5: Balance c-distribution
  console.log('5) Balancing c-distribution...');
  if (isReading && passages && passages.length > 0) {
    const beforeDist = cDistribution(passages.flatMap(p => p.qs));
    passages = balancePassages(passages);
    const afterDist = cDistribution(passages.flatMap(p => p.qs));
    console.log(`   Before: c:[${beforeDist.join(',')}] → After: c:[${afterDist.join(',')}]\n`);
  } else if (questions && questions.length > 0 && (opts.type === 'single' || opts.type === 'context')) {
    const beforeDist = cDistribution(questions);
    questions = balanceCDistribution(questions);
    const afterDist = cDistribution(questions);
    console.log(`   Before: c:[${beforeDist.join(',')}] → After: c:[${afterDist.join(',')}]\n`);
  } else if (questions && questions.length > 0) {
    console.log(`   Skipped (type: ${opts.type} — no c-distribution needed)\n`);
  } else {
    console.log('   No questions to balance\n');
  }

  // Check if we have anything to output
  const finalCount = isReading
    ? (passages?.length || 0)
    : (questions?.length || 0);

  if (finalCount === 0) {
    console.log('No questions survived the pipeline. Nothing to output.');
    return;
  }

  // Step 6: Output
  console.log(`6) Output → ${output}...`);

  if (output === 'dry-run') {
    console.log('\n--- DRY RUN PREVIEW ---\n');
    if (isReading && passages) {
      for (const p of passages) {
        console.log(`  Passage: "${p.t}"`);
        console.log(`  Text: "${p.tx.slice(0, 100)}..."`);
        for (const q of p.qs) {
          console.log(`    Q: ${q.q}`);
          console.log(`    O: ${q.o.map((o, i) => `[${i === q.c ? '*' : ' '}] ${o}`).join(' | ')}`);
        }
        console.log('');
      }
      console.log(`Total: ${passages.length} passages (${passages.reduce((s, p) => s + p.qs.length, 0)} questions)`);
    } else if (questions) {
      for (const q of questions) {
        console.log(`  Q: ${q.q}`);
        if (opts.type === 'matching' && q.pairs) {
          for (const [l, r] of q.pairs) console.log(`    ${l} → ${r}`);
        } else if (opts.type === 'multiple' && q.correct_indices) {
          console.log(`  O: ${q.o.map((o, i) => `[${q.correct_indices.includes(i) ? '*' : ' '}] ${o}`).join(' | ')}`);
        } else {
          console.log(`  O: ${q.o.map((o, i) => `[${i === q.c ? '*' : ' '}] ${o}`).join(' | ')}`);
        }
        if (q.passage_title) console.log(`  Passage: ${q.passage_title}`);
        if (q.passage_text) console.log(`  Text: ${q.passage_text.slice(0, 100)}...`);
        console.log(`  E: ${q.e}`);
        if (q._topic) console.log(`  Topic: ${q._topic}`);
        if (q._difficulty) console.log(`  Difficulty: ${q._difficulty}`);
        console.log('');
      }
      console.log(`Total: ${questions.length} questions (type: ${opts.type})`);
    }
    console.log('\n--- END DRY RUN (no changes made) ---');
  } else if (output === 'file') {
    if (isReading && passages) {
      const path = appendToReadingFile(subject, passages);
      console.log(`   Appended ${passages.length} passages to ${path}`);
    } else if (questions) {
      const path = appendToRegularFile(subject, questions);
      console.log(`   Appended ${questions.length} questions to ${path}`);
    }
  } else if (output === 'supabase') {
    const count = await outputToSupabase(subject, questions, passages, source, opts.type);
    console.log(`   Inserted ${count} rows into Supabase`);
  }

  console.log('\nPipeline complete!');
}

// ── Section 12: Main entry ──────────────────────────────────────────────────

const opts = parseArgs();
try {
  await validateArgs(opts);
  await runPipeline(opts);
} catch (e) {
  console.error(`\nFatal error: ${e.message}`);
  if (process.env.DEBUG) console.error(e.stack);
  process.exit(1);
}
