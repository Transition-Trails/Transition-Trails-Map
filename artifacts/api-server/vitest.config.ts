import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['src/__tests__/**/*.test.ts'],
    env: { NODE_ENV: 'test' },
    coverage: {
      provider: 'v8',
      include: ['src/routes/**/*.ts', 'src/lib/**/*.ts'],
      exclude: ['src/__tests__/**'],
      thresholds: { statements: 60 },
      reporter: ['text', 'json-summary'],
    },
  },
});
