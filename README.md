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
- **Player profile** (`#player/<id>`): evolution charts (body fat, fat-free mass, hydration), all measurements, dated health notes, tags and a **printable PDF report** (browser print dialog; health notes are optional).
- **Compare**: any two rounds, any measure, optionally per group, with group average.
- **Import report**: photos/screenshots (JPG, PNG, WebP) and PDFs of Arboleaf reports (summary screen or full "Body Composition Analysis" report). Text is read on the device with OCR (Tesseract.js and PDF.js are loaded from a CDN the first time; files are never uploaded), values are cross-checked, and you review and correct everything before saving.
- **Settings**: thresholds, rounds (archive), **CSV import** (with preview), CSV/JSON export.
- Responsive layout with a mobile drawer menu.

## Notes on data storage
No database updates are ever needed after setup: dated health notes and player tags are stored in the existing `settings` table (keys `player_notes` and `player_tags`). The first time the app loads, it carries over each player's old single health note automatically. Both are included in the JSON export.
