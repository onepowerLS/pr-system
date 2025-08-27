# PR System Email Notification E2E Tests

This directory contains end-to-end (E2E) tests for verifying email notification functionality in the PR System using Playwright for browser automation.

## Overview

The tests automate the following flow:
1. Log in to the PR System
2. Navigate to the PR creation form
3. Fill out all required fields
4. Submit the PR
5. Capture console logs to verify email notification details
6. Analyze logs to confirm fixes for:
   - Requestor name resolution issues
   - Email duplication in CC lists
   - Category/vendor name resolution

## Prerequisites

- Node.js 16 or higher
- npm
- Chrome browser
- The PR System running locally on port 5173

## Running the Tests

### Option 1: Quick Setup and Run

Use the provided setup script:

```bash
cd e2e-tests
./src/setup-and-run.sh
```

This script will:
- Install dependencies
- Set up Playwright
- Run the tests
- Display results with verification of fixes

### Option 2: Manual Setup and Run

```bash
# Install dependencies
cd e2e-tests
npm install

# Install Playwright browsers
npx playwright install chromium

# Run the tests
npm test
```

## Test Results

After running the tests, check the following files:
- `logs/browser-console.log` - All browser console logs from the test run
- `logs/email-output.json` - Extracted email notification details for analysis

## Configuration

Test parameters can be modified in the following files:
- `playwright.config.ts` - Browser and environment configuration
- `src/email-notification.test.ts` - Test credentials and validation logic

## Notes

- The tests are designed to work with the PR System running in development mode (`npm run dev`)
- Test credentials can be adjusted in the test file based on your local setup
- The validation logic specifically checks for the fixes implemented in the email notification system
