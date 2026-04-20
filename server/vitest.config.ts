import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/__tests__/**/*.test.ts'],
    // Generous timeouts for integration + Socket.IO tests
    testTimeout: 15000,
    hookTimeout: 15000,
    // Run each test file in a separate process so module-level state
    // (agent Map, room Map) is fresh per file
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: false,
      },
    },
  },
});
