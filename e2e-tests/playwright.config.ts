import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

export default defineConfig({
  testDir: './src',
  timeout: 60000, // 60 seconds timeout for tests
  expect: {
    timeout: 15000, // 15 seconds timeout for expectations
  },
  // Run tests in files in parallel
  fullyParallel: false,
  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,
  // Retry tests on CI
  retries: process.env.CI ? 2 : 0,
  // Reporter to use
  reporter: [['html'], ['list']],
  // Shared settings for all projects
  use: {
    // Base URL for all tests
    baseURL: 'http://localhost:5173',

    // Capture trace for each failed test
    trace: 'on-first-retry',
    
    // Record video for each test
    video: 'on-first-retry',
    
    // Record screenshots for failures
    screenshot: 'only-on-failure',
  },

  // Configure projects for different browsers
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // Local development web server
  webServer: {
    command: 'cd .. && npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
    timeout: 120000,
  },
});
