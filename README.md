# FUTEDU Bioimpedance Tracker

Single-file web app (`index.html`) backed by Supabase. **No player data lives in this folder**: the app only holds the (public by design) Supabase URL and anon key. Access is controlled by login + Row Level Security, so without signing in the database returns nothing.

## One-time setup
1. Create the Supabase project `futedu` (EU region).
2. **SQL Editor**: run `schema.sql` (tables + RLS).
3. **Authentication → Users → Add user** (email + password) and **Authentication → Sign In / Providers → disable "Allow new users to sign up"**.
4. **Project Settings → API**: copy the *Project URL* and the *anon public* key into `SUPABASE_URL` / `SUPABASE_ANON_KEY` at the top of the script in `index.html`. Never use the `service_role` key.
5. Load the existing data once with the migration SQL (generated outside the repo, never committed), then open the app and check the roster and September history.

## Publishing (GitHub Pages)
Publish this folder from a **separate public repository that contains only these files** (`index.html`, `schema.sql`, `README.md`). Do not make the main FUTEDU repo public: its Git history still holds player data.

## Features
- **Dashboard**: KPIs, players needing attention, team average body fat by round, results by group (tags), classification overview, pending list, backup reminder.
- **Bioimpedance**: search, filters (pending / measured / flagged / health notes), group filter, sort, check-ins, per-player cards, **Quick entry** table for typing many players at once.
- **Player profile** (`#player/<id>`): evolution charts (body fat, fat-free mass, hydration), all measurements, dated health notes, tags and a **printable one-page PDF report** (same look as the round report, weight first, footer at the bottom of the A4 page) (browser print dialog; health notes are optional).
- **Round report**: one A4 "Flagged Players Report" (dark header, counters, one table per target: body fat, subcutaneous fat, hydration, BMI, skeletal muscle, plus visceral fat, fat-free mass and asymmetry when there is data). Create it any time from Bioimpedance > *Round report*, from Settings > Rounds (any past round), or right after archiving a round. Optional group filter; lists unmeasured players. Uses the browser print dialog: choose *Save as PDF* (file name suggested: `futedu-nutrition-report-DDMMYYYY`).
- **Anthropometry**: per-player profile with the fixed data (date of birth, sex, ethnicity, height, sitting height, arm span; editable if re-measured, and each assessment keeps its own copy so past results do not change) and assessments with body mass, 6 skinfolds and 4 girths, each taken once or three times (with three readings the mean is used, otherwise the first; a warning above 1 % / 5 % between the first two suggests a third reading). Results: sum of 6 skinfolds, fat (Yuhasz, and Slaughter for young people), adipose tissue (Ross and Kerr), muscle (Lee), residual mass, BMI, corrected girths and muscle areas, cormic index, relative arm span, fat distribution; change vs the previous assessment (flags changes larger than the usual error) and comparison with the academy group; a one-page A4 report with a neutral written summary. **Import past assessments** from the Excel anthropometry workbook (.xlsx/.xlsm, first sheet; several files at once or by dropping them on the page): name, sex, ethnicity, date of birth, the assessment and, when filled in, the previous one; a review screen lets you correct everything, match the player and skip or replace existing dates. Read on the device, nothing is uploaded. PDF import is not needed: every past PDF has its Excel, which is the better source. **Rounds**: the current round starts on a date (default: start of the half-year; editable, or "Start a new round" for today); the list shows who is Done or Pending in it, with a filter, a counter and a Measure button, so imported past assessments do not count as the new round. The **New assessment** screen has a live preview (entered measures, sum of 6, fat, muscle, BMI), the previous values next to each field, Enter to jump to the next measure, a sticky footer and "Save and next pending player". Stored in the settings table (`anthro_round`).
- **Dashboard**: a quiet Anthropometry line (players assessed in the current round, pending count, last assessment), since assessments are done once a semester while bioimpedance is monthly.
- **Compare**: any two rounds, any measure, optionally per group, with group average.
- **Import report**: photos/screenshots (JPG, PNG, WebP) and PDFs of Arboleaf reports (summary screen or full "Body Composition Analysis" report). Text is read on the device with OCR (Tesseract.js and PDF.js are loaded from a CDN the first time; files are never uploaded), values are cross-checked, and you review and correct everything before saving.
- **Settings**: thresholds, rounds (archive), **CSV import** (with preview), CSV/JSON export.
- **Check-ins** are shared across devices (stored in the `settings` table, key `checkins`) and cleared when a round is archived.
- **Light, dark or automatic theme** (toggle in the side menu; remembered on the device; printed reports are always light), toast notifications, drag-and-drop import anywhere, and a `/` shortcut to search players.
- **App shell**: dark theme by default (light and automatic available), a loading screen on start-up (with a hint and a Reload button if the connection is slow), **refresh by pulling down** on a phone or **scrolling up at the top** on a computer (reloads the data; refuses if Quick entry has unsaved values), a **Recipes** section (placeholder for now) and **Install app** (Windows via Edge/Chrome, Android, desktop; manual steps shown for iPhone).
- Responsive layout with a mobile drawer menu.

## Notes on data storage
No database updates are ever needed after setup: dated health notes, player tags and check-ins are stored in the existing `settings` table (keys `player_notes`, `player_tags` and `checkins`). The first time the app loads, it carries over each player's old single health note automatically. Both are included in the JSON export.
