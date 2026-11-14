import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://thebiologicaledge.com',
  trailingSlash: 'always',
  integrations: [sitemap({ filter: (page) => !page.includes('/guide/') && !page.includes('/thanks/') })],
});
