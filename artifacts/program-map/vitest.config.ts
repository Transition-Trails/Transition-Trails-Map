import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': resolve(__dirname, './src') },
  },
  test: {
    environment: 'node',
    globals: true,
    include: ['src/__tests__/**/*.test.ts', 'src/__tests__/**/*.test.tsx'],
    // Component tests in src/__tests__/components/ run in jsdom so React
    // rendering, DOM queries, and @testing-library/react all work correctly.
    environmentMatchGlobs: [
      ['src/__tests__/components/**', 'jsdom'],
    ],
    // jest-dom matchers are only needed in the jsdom component tests
    setupFiles: [],
    coverage: {
      provider: 'v8',
      include: ['src/hooks/**/*.ts', 'src/data/**/*.ts'],
      reporter: ['text', 'json-summary'],
    },
  },
});
