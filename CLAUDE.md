# FUTEDU Tracker – Repo Context

Bioimpedance tracker for the **FUTEDU Academy** (youth football academy). Single-file web app (`index.html`), published with **GitHub Pages** from `main`. This is the **only** copy of the app. Recipes, session docs and handouts live in a separate private repo.

## Files
- `index.html`: the whole app (HTML, CSS, JS). Data lives in Supabase; the page only holds the public project URL and publishable key.
- `schema.sql`: tables and Row Level Security (run once in the Supabase SQL Editor when creating a project).
- `manifest.webmanifest`, `favicon.ico`, `icons/`: app icons (FUTEDU shield) for browsers and mobile home screens.
- `README.md`: setup and feature list.

## Privacy (minors' health data)
- This repo is **public**. It must never contain player names, measurements, health notes, import/export files (CSV/JSON), screenshots or PDFs of reports, seed or migration SQL with data, or any Supabase secret (`service_role` or secret key). The URL and publishable key in `index.html` are public by design; access is controlled by login and RLS.
- Player data is stored in Supabase only (tables plus the `settings` table: thresholds, notes, tags, check-ins). New features must not need schema migrations: use the `settings` table for extra data.
- OCR of reports runs in the browser; files are never uploaded.

## Conventions
- Brand: black/dark grey, orange `#ff5405`, white; light grey background; rounded iOS-like cards, buttons as rounded squares; font stack: system / Helvetica Neue. All UI text in **English**.
- Colors come from the CSS variables in `:root` (light) and the dark overrides; never hard-code colors in CSS or generated HTML, so both themes and the always-light print report keep working. Check new UI in both themes.
- Keep it a single dependency-free file where possible; external libraries are loaded from a CDN only when needed (Supabase client, Tesseract.js, PDF.js).
- Test changes with a mocked Supabase client in a headless browser before opening a PR (there is no real backend in the sandbox).

## Git
- **Never push to `main`** (it is live). Work on a branch and open a PR; the owner reviews and merges it.
