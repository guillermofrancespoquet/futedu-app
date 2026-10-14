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

## Planned work (short term)
- **Anthropometry module, target: December 2026.** The owner will provide an HTML anthropometry calculator to adapt; it is not in the repo yet. Scope agreed so far:
  - Inputs per player and assessment: date of birth, age, weight, height, sitting height and arm span, plus **6 skinfolds and 4 girths only**. Conclusions are derived from those values.
  - Same conventions as the bioimpedance part: data in Supabase (use the `settings` table or a new approach that needs no schema migration, to be decided when the calculator arrives), photo/PDF/CSV import if useful, a printable one-page report per player and a round/team report in the same FUTEDU style, light and dark themes.
  - Date of birth is personal data of minors: it lives only in Supabase, never in the repo or in examples.
  - Before designing anything, the owner will provide the calculator HTML and an **Excel with the candidate formulas**; together we pick the ones worth keeping (anything needing measurements outside the 6 skinfolds + 4 girths + basic sizes is out). Keep the wording neutral and non-diagnostic, like the rest of the app.
  - **Source material received (Oct 2026), not stored in the repo** (it holds a real player's data and the anthropometrist's contact details): an Excel (`Antropometría y Somatocarta Sencillo`, Spanish) and a NutriLogos HTML calculator (clients, ISAK triple measures, results, somatochart, evolution charts, football Σ8 percentiles, PDF import, report, own Supabase sync). The Excel matches our scope exactly; the HTML goes further (bone diameters, 8 skinfolds, waist/hip). **Build from the Excel's formulas, port ideas (not code or branding) from the HTML. UI and reports in English.**
  - **Inputs** (Excel): sex, ethnicity (Caucasian / Black / Asian), date of birth, assessment date, body mass, height, sitting height, arm span; skinfolds: triceps, subscapular, supraspinal, abdominal, thigh, calf; girths: relaxed arm, flexed and contracted arm, mid-thigh, calf. Each measure can be taken 2-3 times: value = harmonic mean of two, or median of three; flag when the difference between the first two exceeds 1 % (sizes and girths) or 5 % (skinfolds); a single measure is used as is. Age = (assessment date - birth date) / 365.25 (the Excel mixes 365 and 365.25: use one).
  - **Decisions taken with the owner (Oct 2026)**:
    - **No maturity offset / peak height velocity** and no maturity classification at all (not needed for the academy players, so no age-range gating either).
    - **No Z-scores** (Phantom). The Excel's "difference to previous" Z block is therefore not needed.
    - **Age** = (assessment date - date of birth) / 365.25 (one convention everywhere).
    - **BMI and fat percentage are always shown**, each with a short neutral caveat (BMI does not tell muscle from fat in athletes; skinfold equations are estimates, so trends matter more than a single value). No adult BMI category labels.
    - **Durnin and Womersley (1974) is out**: it needs biceps and iliac-crest skinfolds, which are not among the 6 (the supraspinal site is not the iliac-crest site). **Fat percentage: Yuhasz (1974) is the main estimate; Slaughter et al. (1988) is shown as a complementary estimate, always labelled as an equation for young people (8-18 years).** Use the triceps + calf version, which needs only sites we measure and no maturity stage (as commonly cited: boys %fat = 0.735 x (triceps + calf) + 1.0; girls %fat = 0.610 x (triceps + calf) + 5.1; verify the coefficients against the original paper before implementing).
    - **References: no fixed targets and no external reference table.** The report works with **evolution** (change vs the previous assessment, flagging changes larger than the measurement error) and **comparison within the academy group** (group mean and the player's position in it). No adult ISAK table, no editable targets for now.
    - **Report conclusions are still to be defined** with the owner, limited to what the 6 skinfolds, 4 girths and basic sizes support.
  - **Outputs to keep**: sum of 6 skinfolds; corrected girths (girth - pi x skinfold / 10) for arm, thigh and calf; muscle cross-sectional areas (corrected girth^2 / 4pi); flexed minus relaxed arm; fat mass % (Yuhasz 1974: men 3.64 + 0.097 x sum6, women 4.56 + 0.143 x sum6); adipose tissue mass (Ross and Kerr: z = (sum6 x 170.18 / height - 116.41) / 34.79, mass = (z x 5.85 + 25.6) / (170.18 / height)^3); muscle mass (Lee 2000, uses the three corrected girths, height, sex, age, ethnicity); residual = mass - adipose - muscle (no bone term without diameters); BMI, cormic index (sitting height / height, sex-specific cut-offs), relative arm span, fat distribution index ((triceps + thigh + calf) / (subscapular + supraspinal + abdominal) x 100), share of muscle area by arm / thigh / calf; difference vs the previous assessment (flag changes larger than the measurement error) and position within the academy group.
  - **Left out** (needs data we will not collect, or not needed): somatotype (bone diameters), Rocha bone mass, Durnin and Womersley, waist-hip ratio, football sum-of-8 percentile tables (8 skinfolds), Phantom Z-scores, maturity offset.
  - **Cautions**: Yuhasz and Ross-Kerr were not derived on teenagers, so present the fat estimates as estimates; keep wording neutral and non-diagnostic everywhere.

## Git
- **Never push to `main`** (it is live). Work on a branch and open a PR; the owner reviews and merges it.
