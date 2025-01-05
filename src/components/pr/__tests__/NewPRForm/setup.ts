import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';

// Extend expect matchers
expect.extend({
  // Add custom matchers here if needed
});

// Global beforeEach
beforeEach(() => {
  // Reset all mocks before each test
  vi.clearAllMocks();
});

// Global afterEach
afterEach(() => {
  // Clean up mounted components
  cleanup();
  
  // Clear any pending timers
  vi.clearAllTimers();
  
  // Reset any modified environment variables
  process.env = { ...process.env };
});

// Handle console errors during tests
const originalConsoleError = console.error;
console.error = (...args) => {
  if (
    typeof args[0] === 'string' &&
    args[0].includes('Warning: ReactDOM.render is no longer supported')
  ) {
    return;
  }
  originalConsoleError.apply(console, args);
};
