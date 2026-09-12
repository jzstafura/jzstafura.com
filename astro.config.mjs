// @ts-check
import { defineConfig } from 'astro/config';
import { realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import sitemap from '@astrojs/sitemap';
import react from '@astrojs/react';

// node_modules is symlinked out to ~/.dev-artifacts (see CLAUDE.md). Vite's dev
// server refuses to serve files outside the project root, so without this every
// React island 403s on @astrojs/react/dist/client.js and fails to hydrate under
// `npm run dev`. Resolve the symlink target rather than hardcoding a path, so
// this stays correct if node_modules is ever a real directory again.
const projectRoot = fileURLToPath(new URL('.', import.meta.url));
let depsRoot = projectRoot;
try {
  depsRoot = path.dirname(realpathSync(path.join(projectRoot, 'node_modules')));
} catch {
  // node_modules missing (pre-install); projectRoot alone is fine.
}

// https://astro.build/config
export default defineConfig({
  site: 'https://jzstafura.com',
  integrations: [sitemap(), react()],
  vite: {
    server: {
      fs: {
        allow: [projectRoot, depsRoot],
      },
    },
  },
});
