# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start dev server at localhost:4321
npm run build     # Production build to ./dist/
npm run preview   # Preview production build locally
```

**Requires Node >=22.12.0**

## Tech Stack

- **Astro 6** — static site generator with file-based routing
- **React 19** — used only for interactive island components (visualizations, demos)
- **TypeScript** — strict mode via `astro/tsconfigs/strict`
- **React components** use `.jsx` (not `.tsx`) despite TypeScript strict mode elsewhere

## Architecture

### Routing
Every `.astro` file in `src/pages/` becomes a route. No dynamic routing is used — all pages are statically generated.
Section subdirectories: `pages/writing/`, `pages/lab/`, `pages/educational/`, `pages/fun/`, `pages/arrival/`, `pages/consulting/`

### Layouts
All pages extend `src/layouts/BaseLayout.astro`, which handles nav, footer, SEO meta tags (Open Graph, Twitter cards, canonical URLs), and sitemap integration.
Site URL (`https://jzstafura.com`) is set in `astro.config.mjs` — required for sitemap and canonical URLs.

### React Islands
Interactive components live in `src/components/` and are imported into `.astro` pages with `client:load`. The rest of the site is static HTML. React is only used where interactivity is needed (scientific visualizations, network diagrams).
Components are organized by section: `src/components/educational/`, `src/components/arrival/`

### Content Collections
Blog posts are Markdown files in `src/content/writing/` managed via Astro's content loader. Schema is defined in `src/content.config.ts` with Zod — fields include `title`, `date`, `description`, `tags`, `external_url`, `internal_url`, `venue`.
Only the `writing` collection is registered in the schema; `src/content/arrival/` exists but is not a typed collection.

### Lab Projects
Lab projects require two coordinated changes:
1. Add an entry to the `projects` array in `src/pages/lab/index.astro` — fields: `title`, `slug`, `status`, `statusClass`, `description`, `tags[]`, `liveUrl` (or `null`)
2. Create `src/pages/lab/<slug>/index.astro` for the project detail page

There is no content collection for lab projects; the index array is the source of truth.

### Styling
Global CSS variables (colors, fonts, 860px max-width) are in `src/styles/global.css`. Component styles are scoped within each `.astro` file. No CSS framework is used.
