# jzstafura.com

Personal site of Joseph Z. Stafura, PhD — cognitive psychologist, researcher, and research administrator based in Pittsburgh, PA.

**Live site:** [jzstafura.com](https://jzstafura.com)

## Tech Stack

- **Astro 6** — static site generator, file-based routing, zero JS by default
- **React 19** — used only for interactive island components (`client:load`); all other pages are static HTML
- **TypeScript** — strict mode; React components use `.jsx` (not `.tsx`)
- No CSS framework — global variables in `src/styles/global.css`, scoped styles per page

## Local Development

Requires Node >= 22.12.0.

```bash
npm install
npm run dev       # localhost:4321
npm run build     # production build → ./dist/
npm run preview   # preview production build locally
```

## Site Sections

| Route | Content |
|---|---|
| `/lab/` | Research projects & tools: Intellectual Network Map, Hallucination Detection, NOFO Processor, Violence Research Dashboard |
| `/writing/` | Essays and articles on cognition, AI, organizations, and policy |
| `/consulting/` | Organizational diagnostics and applied measurement |
| `/educational/` | Interactive science visualizations: Bloch sphere, CRISPR-Cas9, EEG P300, ERP Language |
| `/fun/` | Side projects: Banana Santana, SoulWrap |
| `/about/` | Bio, education, experience |
| `/arrival/` | Network diagram visualization project |

## Adding Content

**New lab project** — two files required:
1. Add entry to the `projects` array in `src/pages/lab/index.astro`
2. Create `src/pages/lab/<slug>/index.astro` for the detail page

**New writing post** — add a Markdown file to `src/content/writing/`. Required frontmatter: `title`, `date`, `description`. Optional: `tags[]`, `external_url`, `internal_url`, `venue`. Schema is in `src/content.config.ts`.

**New interactive visualization** — build as a React component in `src/components/`, import into an `.astro` page with `client:load`.

## Deployment

The site URL (`https://jzstafura.com`) is set in `astro.config.mjs` and is required for sitemap generation and canonical URLs. All pages extend `src/layouts/BaseLayout.astro`, which handles nav, footer, and SEO meta tags.
