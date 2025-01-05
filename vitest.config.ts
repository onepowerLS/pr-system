import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/components/pr/__tests__/NewPRForm/setup.ts'],
    coverage: {
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/setupTests.ts',
        '**/*.d.ts',
        '**/*.test.{ts,tsx}',
        '**/mocks/**',
      ],
    },
    testTimeout: 10000,
    hookTimeout: 10000,
    pool: 'forks', // Use process isolation for better memory management
    poolOptions: {
      threads: {
        singleThread: true, // Reduce memory usage by running tests sequentially
      },
    },
    clearMocks: true,
    mockReset: true,
    restoreMocks: true,
    include: ['**/*.test.{ts,tsx}'],
  },
});
