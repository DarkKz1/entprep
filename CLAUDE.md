# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Rules for Claude

### Keep this file up to date
After ANY structural change to the project (new files, deleted files, new dependencies, new features, architecture changes, question count changes), **update the relevant sections of this CLAUDE.md or .claude/rules/ files immediately** in the same session. Never let these files go stale.

### Challenge the user's decisions
The project owner is not a professional developer. When the user proposes something — **always evaluate it critically before executing**. If you see a better approach, a flaw in reasoning, or a risk the user hasn't considered — speak up immediately. Don't just comply. This applies to everything: technical decisions, product ideas, priorities, UX choices, architecture. Push back with a clear explanation and offer a better alternative. Be direct but not condescending. The user explicitly wants to be challenged — silence is not politeness, it's a disservice.

### No wheel inventions
Before writing custom implementations, check if an existing npm package or built-in browser/React API already solves the problem. Prefer well-maintained libraries over custom code. When reviewing the codebase, flag custom implementations that could be replaced by existing solutions.

## Project Overview

ENTprep is a TypeScript + React educational web app for Kazakhstan's Unified National Testing (ЕНТ). Practice tests across 13 subjects with **28 000+ questions** in Supabase (284 subtopics, 150/subject static fallback), AI explanations, adaptive learning, full ЕНТ simulation, leaderboard, social features, real-time duels, and a university grant calculator.

**Live URL:** https://entprep.netlify.app

## Project Structure

```
entprep-app/src/
├── App.tsx              # Root (providers, navigation, lazy routes)
├── main.tsx             # Entry point
├── types/index.ts       # All shared TypeScript interfaces
├── components/          # 30+ components (Home, Test, FullENT, Adaptive, Progress, etc.)
│   └── ui/              # 18 reusable UI primitives
├── contexts/            # AppContext, AuthContext, NavigationContext, ToastContext
├── locales/             # ru.ts, kk.ts, index.ts (useT hook)
├── hooks/               # useAsyncData, useBreakpoint
├── config/              # subjects, ent, questionPools, supabase, sentry, topics
├── constants/           # styles, screens, themes
├── utils/               # questionStore, questionHelpers, storage, cloudSync, etc.
├── data/questions/      # 13 static fallback files (150q each, .ts)
├── data/universities.ts # 52 universities
└── sw.ts                # Service worker

entprep-app/netlify/functions/   # Serverless API
├── ai-explain.mjs, ai-generate.mjs, ai-plan.mjs
├── admin-action.mjs, leaderboard.mjs, social.mjs, duel.mjs
├── push-subscribe.mjs, push-cron.mjs
└── utils/shared.mjs

entprep-app/scripts/             # Build & generation scripts
└── utils/                       # ent-specs.mjs, constants.mjs, quality.mjs, json.mjs
```

### Key Files

| File | Role |
|------|------|
| `utils/questionStore.ts` | Question loading: memory → Supabase → localStorage → static fallback. Language-aware: `getPool(sid, lang?)` resolves `_kk` fields for Kazakh |
| `config/questionPools.ts` | Central hub — builds `TOTAL_Q`, `ALL_PROFILES`, `SUBS` |
| `contexts/AppContext.tsx` | Global state — history, profile, settings, cloud sync |
| `contexts/AuthContext.tsx` | Supabase auth, premium status, user profile |
| `config/ent.ts` | Full ENT exam config: sections, timing, scoring, profile blocks |
| `config/topics.ts` | TOPIC_MAP — 80 sections, 284 subtopics |
| `scripts/utils/ent-specs.mjs` | Official ENT curriculum from testcenter.kz |
| `locales/index.ts` | i18n: `useT()` hook, `getT()` function |

## Key Features
- 13 ENT subjects, 28 000+ questions (Supabase) + static fallback
- 3 question types: single choice, multiple answer, matching
- Full ENT simulation (120q, 5 subjects, 4h, 140 pts, profile blocks)
- AI explanations, study plans, question generation (Claude Sonnet 4.6)
- Adaptive learning, daily challenges, error review
- Leaderboard, friends system, real-time 1v1 duels
- Supabase auth (Google OAuth + Apple Sign In), cloud sync
- XP/levels, 16 achievements, streaks, daily goals
- Push notifications (streak, errors, weekly — all KZ time)
- Dark/light theme, bilingual (Russian + Kazakh) — UI + question content (q_kk, o_kk, e_kk columns)
- PWA, Sentry, Plausible analytics
- University grant calculator (52 universities)

## Development Commands

```bash
cd entprep-app
npm run dev          # Dev server with hot reload
npm run build        # Production build → dist/
npm run lint         # ESLint check
npm run lint:fix     # ESLint autofix
npm run format       # Prettier format
npm run typecheck    # TypeScript type check (tsc --noEmit)
npm run test         # Run tests (vitest)
npm run test:watch   # Watch mode tests

# Deploy (--no-build avoids OOM on Netlify server)
npx vite build && netlify deploy --prod --dir=dist --no-build
```

## Technical Stack
- **Language**: TypeScript — **Frontend**: React 18 — **Build**: Vite 6.x
- **Hosting**: Netlify (+ Functions) — **Backend**: Supabase (PostgreSQL)
- **AI**: Claude Sonnet 4.6 — **Errors**: Sentry — **Analytics**: Plausible
- **Styling**: Inline styles + themes — **State**: React Context (4 contexts)
- **Icons**: lucide-react — **Fonts**: Unbounded, JetBrains Mono
- **PWA**: vite-plugin-pwa — **Testing**: Vitest (241 tests)
- **Mobile**: Capacitor (android/ios)

## Important Notes
- UI: Russian (default) + Kazakh — switchable in Settings
- Code comments/variables: English
- Question content: Russian (educational material)
- Question explanations include math symbols: ², ³, √, π, ×, ÷, ≈, →

## Detailed Rules (loaded on demand)
- `.claude/rules/questions.md` — subjects, question types, loading pipeline, generation
- `.claude/rules/data-model.md` — data model, localStorage, Supabase schema
- `.claude/rules/i18n.md` — internationalization system
- `.claude/rules/architecture.md` — architecture decisions, patterns
