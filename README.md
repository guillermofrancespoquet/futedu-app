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
Login, roster with check-ins (per device), thresholds, overview of flagged players, manual entry of readings, health notes, rounds (archive a round to start a new one), per-player History table with changes vs. the previous round, JSON export.
