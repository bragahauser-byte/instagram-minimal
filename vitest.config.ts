import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

const r = (p: string) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '@im/core': r('./packages/core/src/index.ts'),
      '@im/filters': r('./packages/filters/src/index.ts'),
      '@im/ui': r('./packages/shared-ui/src/index.ts'),
    },
  },
  test: {
    include: ['tests/unit/**/*.test.ts'],
    environment: 'jsdom',
    environmentOptions: { jsdom: { url: 'https://www.instagram.com/' } },
  },
});
