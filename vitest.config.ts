import { defineConfig } from 'vitest/config';

/**
 * Shared Vitest configuration base used by every workspace package.
 * Packages import this and extend as needed.
 */
export const sharedVitestConfig = defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    globals: false,
    pool: 'threads',
    passWithNoTests: true,
  },
  esbuild: {
    target: 'es2022',
  },
});

export default sharedVitestConfig;
