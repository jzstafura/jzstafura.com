# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start dev server at localhost:4321
npm run build     # Production build to ./dist/
npm run preview   # Preview production build locally
npx astro check  # TypeScript type-checking
```

**Requires Node >=22.12.0**

There is no linting or test suite.

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
Valid `statusClass` values: `status-live` (green), `status-research` (amber), `status-tool` (blue).

### Educational Demos
Educational demos follow the same pattern as lab projects:
1. Add an entry to the `demos` array in `src/pages/educational/index.astro` — fields: `title`, `slug`, `description`, `tags[]`
2. Create `src/pages/educational/<slug>/index.astro` for the demo page

Two embed patterns are in use:

**React island** (standard — used by all JSX components): import the component and render with `client:load`.

**Standalone HTML artifact** (used when the file has its own JS globals, canvas loops, etc.): copy the `.html` file to `public/`, then embed with `<iframe src="/filename.html">`. This isolates the artifact's state from Astro entirely.

All interactive demo pages remove the layout's default padding/max-width so the component fills the viewport:
```astro
<style>
  :global(main) { padding: 0 !important; max-width: none !important; }
  .full-bleed { width: 100%; }
</style>
```

### Top-Level Sections
Adding a new top-level section requires adding a nav link in `src/layouts/BaseLayout.astro`. The nav uses `pathname.startsWith('/section')` to apply the `active` class.

### Styling
Global CSS variables are in `src/styles/global.css`:
- `--color-bg` `--color-text` `--color-muted` `--color-accent` `--color-border`
- `--font-sans` (Georgia serif) · `--font-mono` (Courier New)
- `--max-width: 860px`
- Aliases for the arrival section: `--color-text-primary` `--color-text-secondary` `--color-border-tertiary`

Component styles are scoped within each `.astro` file. No CSS framework is used.

React island components (educational demos) carry their own inline styles and import Google Fonts (`DM Mono`, `Playfair Display`) directly via a `<style>` tag inside the component — they do not inherit site variables.
