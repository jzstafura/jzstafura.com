# Session Handoff — 2026-03-13 (end of day, updated)

## Status: All 6 phases complete. Post-launch editorial pass complete. Site fully deployed.

---

## What's Live

| Route | Status | Notes |
|---|---|---|
| `jzstafura.com/` | ✅ Live | Landing page — redesigned with 2x2 section preview grid |
| `/about/` | ✅ Live | Bio expanded with Perfetti/Language & Literacy lab detail |
| `/consulting/` | ✅ Live | Consulting offerings |
| `/writing/` | ✅ Live | Writing index with content collection |
| `/writing/[slug]/` | ✅ Live | Individual posts from Markdown |
| `/lab/` | ✅ Live | 4 project cards |
| `/lab/intellectual-map/` | ✅ Live | Preview card → GitHub Pages live site |
| `/lab/hallucinations/` | ✅ Live | Research writeup, RQs, pipeline ("Hallucitations" spelling intentional) |
| `/lab/nofo-processor/` | ✅ Live | Tool description + how to use |
| `/lab/violence-dashboard/` | ✅ Live | Preview card → GitHub Pages dashboard |
| `/fun/` | ✅ Live | 2 cards: Banana Santana, SoulWrap |
| `/fun/banana-santana/` | ✅ Live | Full generator, all 6 patterns |
| `/fun/soulwrap/` | ✅ Live | Preview card → live parody site |

---

## Changes Made This Session

### `public/favicon.svg` — NEW
- "JZ" in Georgia serif on a dark (#1a1a1a) rounded square
- Works at all browser tab sizes

### `src/layouts/BaseLayout.astro`
- Default description updated: removed "Data Scientist"
- Favicon `<link rel="icon">` added
- `<link rel="canonical">` added, computed from `Astro.url.pathname`
- Full Open Graph block: `og:type`, `og:url`, `og:title`, `og:description`, `og:site_name`
- Twitter Card tags added
- Nav active state: `pathname.startsWith()` logic + `ul a.active` CSS (dark text, subtle underline)
- Nav order changed to: **Lab, Writing, Consulting, Fun, About**

### `src/pages/index.astro`
- Tagline updated: *"Cognitive psychologist. The numbers follow the questions."*
- Section preview grid added: 2x2 cards with overline label, heading, blurb, animated arrow on hover
- Section order matches nav: Lab, Writing, Consulting, About
- Em dashes removed throughout

### `src/pages/about.astro`
- Tagline updated to match sitewide tagline
- Bio para 1: "data scientist" removed; Charles Perfetti and the Language and Literacy lab named; specific research areas added (word-to-text integration, situation models, EEG/ERP, skilled vs. less-skilled readers)
- Bio para 2: Shiffman name removed
- JAB Lab sentence tightened
- Em dashes replaced throughout
- PhD entry in Education section expanded: Perfetti's lab named, EEG/ERP and behavioral methods noted, three specific papers cited (Stafura & Perfetti 2014; Stafura, Rickles & Perfetti 2015; Fang, Perfetti & Stafura 2017), biphasic learning work included
- Meta description updated

### `src/pages/consulting/index.astro`
- "Shiffman Lab" removed from cred band (now just "EMA Methodology")
- Two em dashes replaced with periods/commas
- Meta description tightened

### Meta descriptions updated on all pages
| Page | New Description |
|---|---|
| `/writing/` | Essays on cognition, AI, organizations, and policy. Published here, on LinkedIn, and on Substack. |
| `/lab/` | Research tools, interactive visualizations, and active projects at the intersection of cognitive science, AI, and data. |
| `/lab/hallucinations/` | Active research into AI-hallucinated citations: when fabrication happens, in which fields, and where in a paper. Pipeline study using CrossRef verification and GPTZero scoring. |
| `/lab/nofo-processor/` | A Claude-powered tool that reads grant solicitations and extracts deadlines, eligibility, critical flags, and preparation timelines for research administrators. |
| `/about/` | Cognitive psychologist and researcher based in Pittsburgh, PA. PhD from the University of Pittsburgh; work in language comprehension, applied statistics, and organizational measurement. |
| `/consulting/` | Validated psychological measurement applied to real organizational problems. Diagnostics, team alignment, and insight gathering grounded in published science. |

---

## Known Notes / Intentional Decisions

- **"Hallucitations"** — the portmanteau spelling in the hallucinations project (hallucination + citations) is intentional throughout. Do not correct it.
- **"jz@jzstafura.com"** — confirmed active, forwards to personal email via Cloudflare Email Routing.
- **Substack handle** — `substack.com/@pghjz` confirmed correct.
- **PhD year 2018** — confirmed correct.
- **Company name** — "Affective Health / The Affective Computing Company" confirmed correct dual name.

---

## Remaining Minor Items (not yet addressed)

- **Sitemap**: `npx astro add sitemap` if not yet run; `astro.config.mjs` should have `site: 'https://jzstafura.com'`. After next deploy, `/sitemap-index.xml` will be live.
- **Cloudflare Web Analytics**: Enable in Cloudflare dashboard → your site → Analytics & Logs → Web Analytics. No code changes needed.
- **OG image**: No `og:image` tag is set. Pages will still preview, but without a custom image. Worth adding a simple 1200x630 card image to `public/` and referencing it in BaseLayout when ready.

---

## Key File Locations

| What | Where |
|---|---|
| Repo | `/Users/pghjz/Library/CloudStorage/Dropbox/projects/jzstafura.com/` |
| Astro config | `astro.config.mjs` |
| Base layout (nav, head, footer) | `src/layouts/BaseLayout.astro` |
| Global CSS (CSS variables, typography) | `src/styles/global.css` |
| Content collection config | `src/content.config.ts` |
| Writing posts (Markdown) | `src/content/writing/` |
| All pages | `src/pages/` |
| Favicon | `public/favicon.svg` |

---

## How to Add a Writing Post

1. Create `src/content/writing/your-slug.md`
2. Add frontmatter:

```markdown
---
title: "Your Title Here"
date: 2026-03-13
description: "One sentence summary."
tags: ["tag1", "tag2"]
# external_url: "https://..." <- uncomment for LinkedIn/Substack pieces
# venue: "Substack"          <- optional label shown as badge
---

Your content here...
```

3. `git add`, `git commit`, `git push origin main` — auto-deploys via Cloudflare.

---

## Prompt for Next Session

> "Continue working on jzstafura.com. Check the session handoff doc. We're working on [specific task]."
