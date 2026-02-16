# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ENTprep is a React-based educational web application for preparing students for Kazakhstan's Unified National Testing (ЕНТ/Единое национальное тестирование). The app provides practice tests across all 11 ЕНТ subjects with 955 questions total, detailed explanations, progress tracking, and a university grant calculator.

**Current Version:** v5.0

## Project Structure

### Files

| File | Purpose | Contents |
|------|---------|----------|
| `entprep-v5.jsx` | Main React app (908 lines) | UI components, config, state management |
| `math_profile_questions.js` | Профильная математика | 100 questions (`MPQ`) |
| `physics_questions.js` | Физика | 70 questions (`PHYS`) |
| `biology_questions.js` | Биология | 85 questions (`BIO`) |
| `chemistry_questions.js` | Химия | 100 questions (`CHEM`) |
| `world_history_questions.js` | Всемирная история | 70 questions (`WH`) |
| `informatics_questions.js` | Информатика | 90 questions (`INFO`) |
| `ENTprep_Development_Plan.md` | Russian-language roadmap | 5 development phases |

### Code Organization (entprep-v5.jsx)

1. **Imports** (lines 1-7): React + 6 external question bank modules
2. **Inline Question Pools** (lines 9-469):
   - `MQ` — Math Literacy (150 questions)
   - `RP` — Reading Passages (20 texts × 5 questions = 100)
   - `HQ` — History of Kazakhstan (80 questions)
   - `GEO` — Geography (55 questions)
   - `ENG` — English (55 questions)
3. **Configuration** (lines 470-535):
   - `UNIS` — University data for grant calculator (20 universities)
   - `SUBJECT_META` — Subject metadata and themes
   - `ALL_PROFILES` — 8 profile subjects, all `available: true`
   - `SUBS` — 3 mandatory subjects config
   - `QUESTION_POOLS` — Maps all 11 subject IDs to question arrays
4. **Utilities** (lines 537-555):
   - `getQs(sid, n)` — Question selection/shuffling; special handling for reading passages, generic for all other subjects
   - `loadData()` / `saveData()` — localStorage persistence
5. **Components** (lines 558-900):
   - `Bar` — Progress bar
   - `ProfileSelect` — Profile selection screen
   - `Home` — Main menu with subject cards
   - `Test` — Quiz interface with timer, answers, explanations
   - `Calc` — University grant calculator
   - `Progress` — Statistics and historical results
   - `Settings` — App configuration and data management
6. **Main App** (line 900+):
   - `App` — Root component with state management and screen navigation

## Subject Architecture

### Mandatory Subjects (3, inline in entprep-v5.jsx)
| Subject | ID | Array | Questions | Per Test |
|---------|----|-------|-----------|----------|
| Мат. грамотность | `math` | `MQ` | 150 | 10 |
| Грамотность чтения | `reading` | `RP` | 100 | 10 |
| История Казахстана | `history` | `HQ` | 80 | 20 |

### Profile Subjects (8, students select 2)
| Subject | ID | Array | File | Questions | Per Test |
|---------|----|-------|------|-----------|----------|
| География | `geography` | `GEO` | inline | 55 | 20 |
| Английский язык | `english` | `ENG` | inline | 55 | 20 |
| Математика | `math_profile` | `MPQ` | `math_profile_questions.js` | 100 | 20 |
| Физика | `physics` | `PHYS` | `physics_questions.js` | 70 | 20 |
| Биология | `biology` | `BIO` | `biology_questions.js` | 85 | 20 |
| Химия | `chemistry` | `CHEM` | `chemistry_questions.js` | 100 | 20 |
| Всемирная история | `world_history` | `WH` | `world_history_questions.js` | 70 | 20 |
| Информатика | `informatics` | `INFO` | `informatics_questions.js` | 90 | 20 |

**Total: 955 questions across 11 subjects.**

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
  profile: { profile1: "math_profile", profile2: "physics" },
  history: [{ date: "ISO string", results: {subjectId: {correct, total}}, profile: {...} }],
  settings: { darkMode: true, showTimer: true, soundEnabled: false }
}
```

## Key Features
- All 11 ЕНТ subjects with 955 questions
- 8 profile subject combinations (Math+Physics, Bio+Chem, Geography+English, etc.)
- Question randomization from larger pools
- Countdown timer per test section
- Detailed explanations for every answer
- University grant calculator (20 universities in Almaty/Astana)
- Dark mode
- Mobile-first (max-width 480px)
- Offline-capable via localStorage

## Limitations
- No backend — all data stored in browser localStorage
- No user authentication
- Progress lost on browser cache clear
- No build system configured (standalone React component)
- Inline styles only (no CSS files)

## Development Commands

No build system is currently configured. To set up local development:

```bash
# Vite (recommended)
npm create vite@latest entprep-app -- --template react
cd entprep-app
# Copy entprep-v5.jsx and all *_questions.js files to src/
npm install
npm run dev    # Dev server
npm run build  # Production build
```

## Common Tasks

### Adding New Questions
1. Open the appropriate file (see Subject Architecture table above)
2. Add questions following the format: `{q:"...", o:["...","...","...","..."], c:N, e:"..."}`
3. Ensure exactly 4 options, correct index 0-3, and a detailed explanation
4. For reading passages (in `entprep-v5.jsx`), use `{t:"Title", tx:"Text", qs:[5 questions]}`
5. No config changes needed — `pool` values use `.length` dynamically

### Adding a New Subject
1. Create `new_subject_questions.js` with `const XYZ = [...]` and `export { XYZ };`
2. Add `import { XYZ } from './new_subject_questions.js';` to `entprep-v5.jsx` (line ~7)
3. Add entry to `ALL_PROFILES` array (line ~519)
4. Add mapping to `QUESTION_POOLS` object (line ~535)

### Modifying Mandatory Subjects
Update the `SUBS` object (line 532) — changes `cnt` (questions per test) or `pool` values.

## Architecture Decisions

**Modular question banks:** Profile subject questions are in separate files to keep `entprep-v5.jsx` manageable. Mandatory subjects (Math, Reading, History) remain inline since they were part of the original monolith. Geography and English also remain inline.

**localStorage:** No backend yet. Chosen for immediate persistence in MVP. Plan to migrate to Supabase/Firebase.

**Mobile-first:** Primary users are high school students on mobile. 480px max-width with inline styles.

**Single component file:** All UI logic in one JSX file for rapid prototyping and artifact/widget deployment. Should be refactored before scaling.

## Important Notes

### Language
- All user-facing text is in **Russian** (Kazakhstan market)
- Code comments and variable names use English
- Question explanations include mathematical symbols: ², ³, √, π, ×, ÷, ≈, →

### Next Steps (from ENTprep_Development_Plan.md)
1. Expand question banks to 150+ per subject
2. Refactor entprep-v5.jsx into separate component modules
3. Add TypeScript
4. Implement full ЕНТ simulation mode (120 questions, 5 subjects, 4 hours)
5. Add adaptive testing based on weak areas
6. Backend integration (Supabase/Firebase)
7. Implement PWA for app-like experience

## Technical Stack
- **Frontend**: React 18+ (Hooks-based functional components)
- **Styling**: Inline styles (no CSS files)
- **State**: React useState/useEffect
- **Storage**: Browser localStorage
- **Icons**: Emoji (no icon library)
- **Question modules**: ES module exports (`export { NAME }`)
