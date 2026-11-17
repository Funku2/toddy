import { defineConfig } from 'astro/config';
import { fileURLToPath } from 'node:url';
import sitemap from '@astrojs/sitemap';

const tsconfig = fileURLToPath(new URL('./tsconfig.json', import.meta.url));

export default defineConfig({
  site: 'https://ivoryandash.ca',
  trailingSlash: 'always',
  integrations: [sitemap({ filter: (page) => !page.includes('/thanks/') })],
  // This site lives in a subfolder of another project. Without this, the bundler walks up
  // into the parent folder's tsconfig, which fails when only this folder is installed.
  vite: { tsconfig, resolve: { tsconfigPaths: false } },
});
