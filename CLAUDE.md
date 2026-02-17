# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ENTprep is a React-based educational web application for preparing students for Kazakhstan's Unified National Testing (ЕНТ/Единое национальное тестирование). The app provides practice tests across all 13 ЕНТ subjects with 1,950 questions total, detailed explanations, progress tracking, a full ЕНТ simulation mode, and a university grant calculator.

**Current Version:** v5.0
**Live URL:** https://entprep.netlify.app

## Project Structure

```
entprep-app/src/
├── components/
│   ├── Bar.jsx           # Progress bar visualization
│   ├── ProfileSelect.jsx # Profile subject selection (2 of 10)
│   ├── Home.jsx          # Main menu with subject cards
│   ├── Test.jsx          # Quiz interface (timer, answers, explanations)
│   ├── FullENT.jsx       # Full ЕНТ simulation (120q, 5 subjects, 4h)
│   ├── Calc.jsx          # University grant calculator
│   ├── Progress.jsx      # Statistics and historical results
│   └── Settings.jsx      # App configuration and data management
├── data/
│   ├── questions/
│   │   ├── math_literacy.js    # MQ — 150 questions
│   │   ├── reading_passages.js # RP — 30 passages × 5q = 150
│   │   ├── history_kz.js       # HQ — 150 questions
│   │   ├── geography.js        # GEO — 150 questions
│   │   ├── english.js          # ENG — 150 questions
│   │   ├── math_profile.js     # MPQ — 150 questions
│   │   ├── physics.js          # PHYS — 150 questions
│   │   ├── biology.js          # BIO — 150 questions
│   │   ├── chemistry.js        # CHEM — 150 questions
│   │   ├── world_history.js    # WH — 150 questions
│   │   ├── informatics.js      # INFO — 150 questions
│   │   ├── law.js              # LAW — 150 questions
│   │   └── literature.js       # LIT — 150 questions
│   └── universities.js         # UNIS — 21 universities (Almaty + Astana)
├── config/
│   ├── subjects.js       # SUBJECT_META, ALL_PROFILES_BASE, SUBS_BASE
│   ├── ent.js            # ENT_CONFIG (sections, timing, scoring)
│   └── questionPools.js  # QUESTION_POOLS, TOTAL_Q, ALL_PROFILES, SUBS (central hub)
├── utils/
│   ├── questionHelpers.js # shuffleOptions(), getQs()
│   └── storage.js         # loadData(), saveData()
├── constants/
│   └── styles.js          # GLOBAL_STYLES (CSS animations, scrollbar, fonts)
├── App.jsx                # Root component (imports, navigation, state)
└── main.jsx               # Entry point (ReactDOM.createRoot)
```

### Key Files

| File | Role |
|------|------|
| `config/questionPools.js` | **Central hub** — imports all 13 question files, builds `QUESTION_POOLS`, `TOTAL_Q`, `ALL_PROFILES` (with dynamic pool counts), `SUBS` |
| `App.jsx` | Root component — state management, screen routing, navbar |
| `entprep-v5.jsx` | **Legacy backup** — original monolithic file (1,232 lines), kept in project root for rollback |

### Export Patterns
- **Data/config/utils** → named exports (`export { MQ }`, `export { loadData, saveData }`)
- **Components** → default exports (`export default Home`)

## Subject Architecture

### Mandatory Subjects (3)
| Subject | ID | Array | File | Questions | Per Test |
|---------|----|-------|------|-----------|----------|
| Мат. грамотность | `math` | `MQ` | `data/questions/math_literacy.js` | 150 | 10 |
| Грамотность чтения | `reading` | `RP` | `data/questions/reading_passages.js` | 150 (30×5) | 10 |
| История Казахстана | `history` | `HQ` | `data/questions/history_kz.js` | 150 | 20 |

### Profile Subjects (10, students select 2)
| Subject | ID | Array | File | Questions | Per Test |
|---------|----|-------|------|-----------|----------|
| География | `geography` | `GEO` | `data/questions/geography.js` | 150 | 20 |
| Английский язык | `english` | `ENG` | `data/questions/english.js` | 150 | 20 |
| Математика | `math_profile` | `MPQ` | `data/questions/math_profile.js` | 150 | 20 |
| Физика | `physics` | `PHYS` | `data/questions/physics.js` | 150 | 20 |
| Биология | `biology` | `BIO` | `data/questions/biology.js` | 150 | 20 |
| Химия | `chemistry` | `CHEM` | `data/questions/chemistry.js` | 150 | 20 |
| Всемирная история | `world_history` | `WH` | `data/questions/world_history.js` | 150 | 20 |
| Информатика | `informatics` | `INFO` | `data/questions/informatics.js` | 150 | 20 |
| Основы права | `law` | `LAW` | `data/questions/law.js` | 150 | 20 |
| Литература | `literature` | `LIT` | `data/questions/literature.js` | 150 | 20 |

**Total: 1,950 questions across 13 subjects (150 each).**

## Data Model

### Question Format (all subjects except reading)
```javascript
{q:"Question text", o:["A","B","C","D"], c:0, e:"Explanation"}
// c = correct answer index (0-3)
```

### Reading Passage Format
```javascript
{t:"Title", tx:"Passage text...", qs:[/* 5 questions in standard format */]}
```

### Question Bank File Template
```javascript
// ==================== SUBJECT: N questions ====================
const ARRAY_NAME = [
// === SECTION TITLE (1-N) ===
{q:"...", o:["...","...","...","..."], c:0, e:"..."},
// ...
];

export { ARRAY_NAME };
```

### LocalStorage Structure (key: `entprep_data`)
```javascript
{
  prof: ["math_profile", "physics"],  // selected profile subjects
  hist: [{ su:"math", co:8, to:10, sc:80, dt:"16.02.2026", tm:540 }],
  st: { exp: true, tmr: true, shf: true },
  lastLogin: "ISO string"
}
```

## Key Features
- All 13 ЕНТ subjects with 1,950 questions (150 per subject)
- 10 profile subject choices (students select 2)
- Full ЕНТ simulation mode (120 questions, 5 subjects, 4 hours, 140 points)
- Question randomization with option shuffling
- Countdown timer per test section
- Detailed explanations for every answer
- University grant calculator (21 universities in Almaty/Astana)
- Progress tracking with per-subject bar charts
- Dark theme, mobile-first (max-width 480px)
- Offline-capable via localStorage

## Development Commands

```bash
cd entprep-app
npm run dev        # Dev server with hot reload
npm run build      # Production build → dist/
npx vite --host    # Dev server accessible on LAN

# Deploy
netlify deploy --prod --dir=dist
```

## Common Tasks

### Adding New Questions
1. Open the appropriate file in `src/data/questions/`
2. Add questions following the format: `{q:"...", o:["...","...","...","..."], c:N, e:"..."}`
3. Ensure exactly 4 options, correct index 0-3, and a detailed explanation
4. For reading passages, use `{t:"Title", tx:"Text", qs:[5 questions]}`
5. No config changes needed — pool counts are computed dynamically via `.length` in `questionPools.js`

### Adding a New Subject
1. Create `src/data/questions/new_subject.js` with `const XYZ = [...]; export { XYZ };`
2. Add import in `src/config/questionPools.js`
3. Add mapping to `QUESTION_POOLS` object
4. Add entry to `ALL_PROFILES_BASE` in `src/config/subjects.js`
5. Add entry to `SUBJECT_META` in `src/config/subjects.js`

### Modifying Mandatory Subjects
Update `SUBS_BASE` in `src/config/subjects.js` — changes `cnt` (questions per test). Pool sizes are computed dynamically.

### Modifying ENT Simulation
Update `ENT_CONFIG` in `src/config/ent.js` — sections, timing, scoring, thresholds.

## Architecture Decisions

**Modular structure:** Refactored from a single 1,232-line monolith into 30+ files across 6 directories. Components, data, config, utils, and constants are cleanly separated.

**Central hub pattern:** `config/questionPools.js` is the single place that imports all question data and builds the runtime objects (`QUESTION_POOLS`, `ALL_PROFILES`, `SUBS`, `TOTAL_Q`). Other modules import from here rather than directly from question files.

**localStorage:** No backend. Chosen for immediate persistence in MVP. Plan to migrate to Supabase/Firebase.

**Mobile-first:** Primary users are high school students on mobile. 480px max-width with inline styles.

**Rollback:** The legacy `entprep-v5.jsx` is kept in the project root. To rollback: `cp entprep-v5.jsx entprep-app/src/App.jsx && cd entprep-app && npm run build`

## Important Notes

### Language
- All user-facing text is in **Russian** (Kazakhstan market)
- Code comments and variable names use English
- Question explanations include mathematical symbols: ², ³, √, π, ×, ÷, ≈, →

### Next Steps
1. ~~Expand question banks to 150+ per subject~~ ✅ Done (1,950 questions)
2. ~~Refactor into separate component modules~~ ✅ Done (30+ files)
3. ~~Implement full ЕНТ simulation mode~~ ✅ Done (120q, 5 subjects, 4h)
4. Add TypeScript
5. Add adaptive testing based on weak areas
6. Backend integration (Supabase/Firebase)
7. Implement PWA for app-like experience

## Technical Stack
- **Frontend**: React 18+ (Hooks-based functional components)
- **Build**: Vite 6.x
- **Hosting**: Netlify
- **Styling**: Inline styles (no CSS files)
- **State**: React useState/useEffect
- **Storage**: Browser localStorage
- **Icons**: Emoji (no icon library)
- **Fonts**: Unbounded (headings), JetBrains Mono (numbers)
- **Module system**: ES module named/default exports
