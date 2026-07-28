# Session Handoff — 2026-07-28

## Status: Site fully deployed. Repo migrated to Google Drive. 10 educational demos live, grouped by category.

---

## What's Live

| Route | Status | Notes |
|---|---|---|
| `/` | ✅ Live | Landing page |
| `/about/` | ✅ Live | Bio, education, experience |
| `/consulting/` | ✅ Live | Consulting offerings |
| `/writing/` | ✅ Live | Content-collection index — 5 entries |
| `/writing/against-synthesis/` | ✅ Live | Full essay page, GAN visuals (`client:visible`) |
| `/arrival/` | ✅ Live | Full essay page, network diagrams |
| `/lab/` | ✅ Live | 4 project cards |
| `/lab/intellectual-map/`, `/hallucinations/`, `/nofo-processor/`, `/violence-dashboard/` | ✅ Live | |
| `/educational/` | ✅ Live | **Now grouped by category** (see below) — 10 demo cards |
| `/fun/` | ✅ Live | 4 cards: Banana Santana, SoulWrap, Valinor Capital, Dramaturgical Slam |

### Educational demos (grouped, in render order)

| Category | Slug | Title |
|---|---|---|
| EEG & Event-Related Potentials | `eeg-p300` | Parietal ERP: Expected vs. Unexpected |
| | `erp-language` | Language ERPs: N400 & P600 |
| | `mmn` | **NEW** — Mismatch Negativity: Pre-attentive Auditory Deviance Detection |
| | `source-to-scalp` | Source to Scalp: The EEG Forward Problem |
| Cognitive Psychology | `psychophysics` | Core Psychophysics |
| | `schneider-shiffrin` | Schneider & Shiffrin (1977): Automatic vs. Controlled Processing |
| Cells, Synapses & Molecules | `crispr-cas9` | CRISPR-Cas9: Programmable DNA Cleavage |
| | `stdp` | Spike-Timing Dependent Plasticity |
| | `memory-consolidation` | **NEW** — Consolidation & Reconsolidation: The Labile Synapse |
| Physics & Computation | `bloch-sphere` | Bloch Sphere Quantum Simulator |

---

## Changes Made This Session

### Repo migration: Dropbox → Google Drive
- Canonical local checkout moved to `…/GoogleDrive-jzstafura@gmail.com/My Drive/projects/jzstafura.com` (fresh `git clone` from GitHub, not a synced copy of the Dropbox folder).
- `node_modules/`, `.astro/`, `dist/` are symlinked to `~/.dev-artifacts/jzstafura.com/` — keeps Drive's sync engine from choking on tens of thousands of small package files.
- **Gotcha**: `npm install` deletes the `node_modules` symlink and writes a real directory back into the Drive tree. Run `./relink-deps.sh` (repo root) after any install to move it back out. `npm run dev`/`build` are safe to run repeatedly without re-running the script.
- Dropbox checkout (`…/Dropbox/projects/jzstafura.com`) kept in place as a fallback, untouched, still at the same commit as `origin/main`. Retire it once the Drive checkout has proven itself over a few real sessions.
- Verified: fresh clone HEAD matched `origin/main` exactly, `npm install` (249 pkgs), `npm run build` (25 pages at time of migration), `npm run dev` smoke-tested via HTTP fetch on several routes — all 200s.

### New educational demos
- **`mmn.jsx` → `MMN.jsx`** at `/educational/mmn/`. Mismatch Negativity: toggle attended/unattended and frequency/duration/intensity deviants; P3a vanishes under inattention while MMN persists; live scalp topography; deviant-minus-standard difference wave.
- **`memory-consolidation.jsx` → `MemoryConsolidation.jsx`** at `/educational/memory-consolidation/`. Six-stage animation: acquisition → early LTP (CaMKII/AMPA) → cellular consolidation (PKA/ERK→CREB) → stable trace → retrieval → reconsolidation. Anisomycin toggle blocks consolidation or reconsolidation, but only when reactivation occurs (Nader et al. 2000 result).
- Both follow the established pattern exactly: PascalCase component in `src/components/educational/`, `client:load` in a dedicated `<slug>/index.astro`, full-bleed layout override.

### Educational index restructured
- `src/pages/educational/index.astro` now groups demo cards under category headings instead of one flat grid. Each `demos[]` entry has a new `category` field; a `categoryOrder` array controls section order and which headings render (empty groups are skipped automatically).
- Four categories currently in use: `EEG & Event-Related Potentials`, `Cognitive Psychology`, `Cells, Synapses & Molecules`, `Physics & Computation`.

### Documentation
- `CLAUDE.md` — added `category` field + `categoryOrder` grouping to the Educational Demos section; added component-file PascalCase naming convention; added a new "Local Repo Location" note documenting the Drive symlink setup and the `relink-deps.sh` gotcha.
- This handoff doc.

---

## Verification Performed

- `npm run build` — 27 pages (was 25), zero errors.
- `npm run dev` + `node --eval fetch(...)` smoke test on `/educational/`, `/educational/mmn/`, `/educational/memory-consolidation/`, `/educational/eeg-p300/`, `/educational/stdp/` — all HTTP 200, correct `<title>` per page.
- Confirmed all four category headings render in `dist/educational/index.html` and all 10 demo `<h3>` titles appear in the correct grouped order.
- `git status` before commit showed exactly the expected diff (1 modified + 4 new files) — nothing stray from the Drive migration leaked in.
- Committed as `20813b3`, pushed to `origin/main` (`aeb2816..20813b3`).

---

## Known Notes / Intentional Decisions

- **"Hallucitations"** — the portmanteau spelling in the hallucinations project (hallucination + citations) is intentional throughout. Do not correct it.
- **Category field is exact-match, case-sensitive** — a typo in a demo's `category` silently drops it into no group (renders nothing) rather than erroring. Double-check spelling against `categoryOrder` when adding new demos.
- **Google Drive is now the working repo** — Dropbox is a fallback only. Don't develop in both simultaneously; changes should go through Drive → commit → push, same as before.

---

## Key File Locations

| What | Where |
|---|---|
| Repo (canonical) | `/Users/jzstafura/Library/CloudStorage/GoogleDrive-jzstafura@gmail.com/My Drive/projects/jzstafura.com/` |
| Repo (fallback, do not develop here) | `/Users/jzstafura/Library/CloudStorage/Dropbox/projects/jzstafura.com/` |
| Dep-relink helper | `relink-deps.sh` (repo root) — run after `npm install` |
| Educational index (category groups) | `src/pages/educational/index.astro` |
| Educational components | `src/components/educational/` |
| Astro config | `astro.config.mjs` |
| Base layout (nav, head, footer) | `src/layouts/BaseLayout.astro` |
| Global CSS | `src/styles/global.css` |
| Content collection config | `src/content.config.ts` |
| Writing posts (Markdown) | `src/content/writing/` |

---

## Prompt for Next Session

> "Continue working on jzstafura.com from the Google Drive repo. Check the 2026-07-28 session handoff doc. We're working on [specific task]."
