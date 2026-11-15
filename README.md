# FlameSight 🔥🛰

**AI-powered fire-safety insights from NASA microgravity combustion data.**
Built by team AstroGhosts for **NASA Space Apps 2026** — challenge *Flame in Freefall: AI-Powered Fire Safety Insights from Microgravity Combustion Data*.

> Data: NASA Physical Sciences Informatics (psi.nasa.gov). Built for NASA Space Apps 2026. Not affiliated with or endorsed by NASA.

---

## The problem

Fire behaves differently in space. Without gravity there is no buoyancy: flames become round, blue and slow, and they live or die depending on ventilation airflow and oxygen. NASA has run dozens of combustion experiments on the ISS and in Cygnus cargo ships, but the results are spread across 24 investigations, ~15.6 TB and ~71,000 files. Future Moon and Mars habitats will use **lower pressure and more oxygen**, which makes fires easier to start.

FlameSight turns that archive into answers: which experiments matter for a given habitat, what the data shows, and whether a fire is likely to burn under given conditions — with every claim linked back to NASA's own data.

## Features

| Page | What it does |
|---|---|
| **Mission Control** | Animated WebGL flame (morphs Earth ↔ microgravity), headline stats computed from the data, five mission scenarios. |
| **Experiment Explorer** | All 24 investigations: search, filter by fire-safety role, sort. Detail pages have a plain-English summary, "why it matters", a chart from the test table, the full sortable NASA table and a link to the real PSI page. |
| **Scenario Risk Ranking** | Transparent 0–100 relevance score per investigation for ISS, Lunar Base, Mars Habitat, Pressurized Rover and Spacesuit. "How we scored this" drawer with live weight sliders. Top-3 must-reads + data-cited recommendations. |
| **Insights** | FLEX outcomes vs diluent gas and O₂; BASS/BASS-II material and O₂ coverage + SAFFIRE-II microgravity vs 1-g; CFI-G hot ignition vs O₂ (normal vs inverse flames); PSI-117 extinction diameter vs pressure. Each with a data-computed takeaway. |
| **Will It Burn?** | Pick fuel, O₂, pressure, airflow, gravity and suppressant gas → Likely / Borderline / Unlikely with confidence, plus the 3 nearest real NASA tests as evidence. The flame reacts live. Moon/Mars are labeled **extrapolated**. |
| **Fire Safety Analyst** | Ask a question; local BM25 retrieval over the catalog + computed facts answers with matched experiments and source chips. Works with **no API key**. Optional `/api/ask` serverless LLM summary. |
| **Guided Demo** | One button runs a ~30-second hands-free tour with captions (Home → Lunar Base → top experiment → simulator → analyst) for recording. Press Esc to stop. |
| **About** | Challenge, method, scoring formula, data limits, sources, AI disclosure. |

Hidden extra: `#/flame-lab` shows the flame engine in 8 states side by side.

## Data

Everything comes from NASA PSI (`psi.nasa.gov`) and is stored raw in `data/raw/`:

- `investigations_catalog.csv` — 24 PSI Combustion Science investigations (objectives, dates, platform, size, PSI link, and our fire-safety tier).
- `test_matrices/*.csv` — the per-test tables for 20 investigations (FLEX, FLEX-2, BASS, BASS-II, SAFFIRE-I/II/III, SAME, SAME-R, ACME BRE/CLD/E-FIELD/s-Flame/Flame Design/CFI-G, CFI, SPICE, SLICE, DAFT, PSI-142).
- `analyzed_data/*.csv` — PSI-117 droplet / cool-flame results.

`scripts/build-data.mjs` (plain Node, no dependencies) parses every CSV with a **per-table normalizer** (the headers differ in every file) and writes JSON to `src/data/generated/` (bundled) and `public/data/` (open data). It runs automatically before `npm run dev` and `npm run build`. No numbers are typed by hand; when a table lacks a value the app says "not in table". `data/summaries.json` holds the plain-English summaries, written from each investigation's objectives field.

**Verified headline numbers (computed by the build script):**

- 24 investigations, 20 with test tables
- 2,917 test records = 1,873 per-test table rows + 1,044 flames ignited listed in ACME daily logs
- FLEX: 274 tests — 186 extinction, 61 disruption, 27 burnout (67.9% self-extinguished)
- Mission dates 1999–2025 (27 years); 15.56 TB and 71,044 files listed in PSI
- 618 tests record what the flame did and power the simulator (FLEX, ACME CFI-G, SAFFIRE-I/II)

## Scoring method (Scenario Risk Ranking)

```
score = 100 × (w_O2·s_O2 + w_P·s_P + w_flow·s_flow + w_role·s_role + w_data·s_data) / Σw
```

- **O₂ / pressure / flow match** — 1.0 if the habitat value is inside the range the experiment actually tested; otherwise `exp(−distance/scale)` with scale = max(5 O₂ points / 0.25 atm / 10 cm/s, 25% of the habitat value); 0.25 if that variable is not in the experiment's table.
- **Fire-safety role** — tier 1 Core 1.0, 2 Strong 0.7, 3 Background 0.4, +0.2 if the role is a priority for the habitat. (Tiers are the team's judgment, not NASA's.)
- **Data richness** — `0.7·log10(1+tests)/log10(701) + 0.15 (has test table) + 0.15 (has analyzed data)`.
- Default weights O₂ 30, pressure 20, flow 15, role 20, data 15 (Spacesuit: 40/25/5/15/15). All adjustable in the app.

Scenario atmospheres: ISS 21% O₂ @ 14.7 psi; Lunar Base 30% @ 10.2 psi (challenge brief: 30%+ at ≤10.2 psi); Mars Habitat = lunar preset (assumption); Pressurized Rover 34% @ 8.2 psi (a NASA-considered atmosphere listed in ACME BRE objectives); Spacesuit 100% @ 4.3 psi. Habitat airflow (20 cm/s, the SAFFIRE test flow; 5 cm/s for suits) is an assumption and is labeled as one.

## "Will It Burn?" model

k-nearest neighbors (k = 7) over 618 NASA tests with outcomes. Distance: O₂ (per 10 points), log-pressure (per factor 2), airflow (per 15 cm/s; 0.5 if not listed), fuel (same 0 / same class 1.0 / other 1.5), suppressant gas mismatch 0.5. Burn score per test: 1 kept burning · 0.8 droplet disruption · 0.6 ignited then self-extinguished · 0.5 partial · 0.25 flash · 0 no ignition/spread. Prediction = 80% neighbors + 20% simple physics prior (50% prior when outside the tested O₂/pressure range). Confidence drops when neighbors disagree, are far away, or conditions are extrapolated.

## Data limits

- **No partial-gravity (Moon/Mars) combustion data exists in PSI.** Those results are extrapolated and labeled.
- Highest O₂ in any PSI test is 85% (ACME CFI-G); spacesuit 100% O₂ is beyond the data.
- BASS/BASS-II tables have no flame-spread column; several ACME tables are daily summaries; FLEX-2's table is a test plan.
- The flame animation is illustrative, not a combustion simulation. FlameSight is educational, not a safety certification.

## Run locally

Requires Node 18+ (tested on Node 22).

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # type-check + production build into dist/
npm run preview    # serve dist/
npm run build:offline   # optional: one self-contained HTML in dist-offline/ (opens by double-click)
```

## Deploy to Vercel

1. Push this folder to a GitHub repo (`git init && git add . && git commit -m "FlameSight" && git push`).
2. On vercel.com → **Add New… → Project** → import the repo. Vercel detects Vite; `vercel.json` already sets build command `npm run build` and output `dist`.
3. *(Optional)* For AI-written answers in the Analyst, add an environment variable **`OPENROUTER_API_KEY`** (and optionally `OPENROUTER_MODEL`, default `openai/gpt-4o-mini`) under Project → Settings → Environment Variables. The key is only used by the serverless functions `api/ask.ts` and `api/search-study.ts`; it is never sent to the browser. Without it, the app uses local retrieval.
4. Deploy. Routing uses a hash router (`/#/simulator`), so every page works on any static host.

Also works on Netlify / GitHub Pages: build with `npm run build` and publish `dist/` (`/api/ask` is Vercel-only; the Analyst falls back to local mode).

## Project structure

```
api/ask.ts                 optional Vercel serverless LLM endpoint (grounded on retrieved rows)
data/raw/                  NASA PSI CSVs (unchanged)
data/summaries.json        plain-English summaries (from the objectives field)
scripts/build-data.mjs     CSV → JSON normalizer
src/lib/                   scoring, k-NN model, retrieval, scenarios, data loaders
src/components/Flame.tsx   three.js GLSL flame shader + canvas fallback
src/pages/                 Home, Explorer, ExperimentDetail, Scenarios, Insights, Simulator, Analyst, About, FlameLab
src/demo/Demo.tsx          guided demo mode
```

Stack: Vite + React 18 + TypeScript + Tailwind CSS, Recharts, Framer Motion, three.js.

## AI tools disclosure

Built with AI assistance (Hark, Cursor) — credited per Space Apps rules. AI helped write code and draft the plain-English summaries from NASA's objectives text; the team reviewed them against the data. All numbers are computed from NASA PSI files by the build script.

## Credits

Data: NASA Physical Sciences Informatics, https://psi.nasa.gov. No NASA logos are used. Not affiliated with or endorsed by NASA.
