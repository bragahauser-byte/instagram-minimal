import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

const r = (p: string) => fileURLToPath(new URL(p, import.meta.url));

// Publicado em https://bragahauser-byte.github.io/instagram-minimal/
export default defineConfig({
  root: r('.'),
  base: process.env.DASHBOARD_BASE ?? '/instagram-minimal/',
  plugins: [react()],
  resolve: {
    alias: {
      '@im/core': r('../../packages/core/src/index.ts'),
      '@im/filters': r('../../packages/filters/src/index.ts'),
      '@im/ui': r('../../packages/shared-ui/src/index.ts'),
    },
  },
  build: { outDir: r('../../dist/dashboard'), emptyOutDir: true },
});
