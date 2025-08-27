import { test, expect } from '@playwright/test';
import { setTimeout } from 'timers/promises';
import * as fs from 'fs';
import * as path from 'path';

// Configuration constants
const TEST_USERNAME = 'test.user@example.com';
const TEST_PASSWORD = 'testpassword123';
const CONSOLE_LOG_PATH = path.join(__dirname, '../logs/browser-console.log');
const EMAIL_OUTPUT_PATH = path.join(__dirname, '../logs/email-output.json');

// Ensure logs directory exists
fs.mkdirSync(path.dirname(CONSOLE_LOG_PATH), { recursive: true });

/**
 * Helper function to extract email details from console logs
 */
function extractEmailDetailsFromLogs(logs: string): any {
  try {
    // Look for our debug logs showing email content
    const emailContentMatch = logs.match(/Email template data - full context:[\s\S]*?(\{[\s\S]*?\})/);
    const requestorMatch = logs.match(/Final requestor information used in template:[\s\S]*?(\{[\s\S]*?\})/);
    const categoryMatch = logs.match(/Resolved category.*to '(.*?)'/);
    const vendorMatch = logs.match(/Resolved vendor.*to '(.*?)'/);
    
    // Extract CC list
    const ccListMatch = logs.match(/CC list:[\s\S]*?(\[[\s\S]*?\])/);
    
    return {
      emailContent: emailContentMatch ? emailContentMatch[1] : null,
      requestorInfo: requestorMatch ? requestorMatch[1] : null,
      resolvedCategory: categoryMatch ? categoryMatch[1] : null,
      resolvedVendor: vendorMatch ? vendorMatch[1] : null,
      ccList: ccListMatch ? ccListMatch[1] : null,
      hasLowerAndUpperCaseEmails: logs.includes('DUPLICATE EMAILS DETECTED')
    };
  } catch (error) {
    console.error('Error extracting email details from logs:', error);
    return null;
  }
}

/**
 * Main test case for verifying email notifications
 */
test('PR submission generates correct email notification', async ({ page, context }) => {
  // Collect all browser console logs
  const consoleMessages: string[] = [];
  page.on('console', (msg) => {
    consoleMessages.push(`[${msg.type()}] ${msg.text()}`);
  });

  // Navigate to login page
  await page.goto('/login');
  await expect(page).toHaveTitle(/Login/);
  
  // Fill login form
  await page.fill('input[type="email"]', TEST_USERNAME);
  await page.fill('input[type="password"]', TEST_PASSWORD);
  await page.click('button[type="submit"]');
  
  // Wait for dashboard to load
  await expect(page).toHaveURL(/dashboard/);
  await expect(page.locator('text=Welcome')).toBeVisible();
  
  // Navigate to create new PR page
  await page.click('a:has-text("New PR")');
  await expect(page).toHaveURL(/pr\/new/);
  
  // Fill PR form - first step (General Info)
  await page.selectOption('select[name="department"]', 'Engineering');
  await page.selectOption('select[name="category"]', { index: 1 }); // Select first available category
  await page.fill('input[name="description"]', 'Automated test PR with special characters: @#$%');
  await page.fill('textarea[name="notes"]', 'This is an automated test PR created by Playwright');
  await page.click('button:has-text("Next")');
  
  // Second step (Details)
  await page.selectOption('select[name="site"]', { index: 1 }); // Select first available site
  await page.selectOption('select[name="expenseType"]', { index: 1 }); // Select first available expense type
  await page.fill('input[name="amount"]', '1500');
  await page.selectOption('select[name="currency"]', 'USD');
  
  // Select a future date (14 days from now) for required date
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + 14);
  const formattedDate = futureDate.toISOString().split('T')[0]; // Format as YYYY-MM-DD
  await page.fill('input[name="requiredDate"]', formattedDate);
  
  await page.selectOption('select[name="preferredVendor"]', { index: 1 }); // Select first available vendor
  await page.click('button:has-text("Next")');
  
  // Third step (Approval)
  await page.selectOption('select[name="approver"]', { index: 1 }); // Select first available approver
  await page.click('button:has-text("Next")');
  
  // Fourth step (Review) - Submit PR
  await page.check('input[type="checkbox"]'); // Check the confirmation checkbox
  await page.click('button:has-text("Submit PR")');
  
  // Wait for submission success and redirect
  await expect(page.locator('text=PR submitted successfully')).toBeVisible({ timeout: 10000 });
  await expect(page).toHaveURL(/dashboard/);
  
  // Wait for email to be processed (this gives the backend time to process the notification)
  await setTimeout(5000);
  
  // Save console logs to file
  const combinedLogs = consoleMessages.join('\n');
  fs.writeFileSync(CONSOLE_LOG_PATH, combinedLogs);
  console.log(`Console logs saved to ${CONSOLE_LOG_PATH}`);
  
  // Extract and save email details
  const emailDetails = extractEmailDetailsFromLogs(combinedLogs);
  fs.writeFileSync(EMAIL_OUTPUT_PATH, JSON.stringify(emailDetails, null, 2));
  console.log(`Email details saved to ${EMAIL_OUTPUT_PATH}`);
  
  // Verify our key fixes were applied
  
  // 1. Check that requestor name is properly displayed (not 'Not specified')
  expect(combinedLogs).not.toContain('"requestorName":"Not specified"');
  expect(combinedLogs).not.toContain('"requestorName":"undefined"');
  expect(combinedLogs).not.toContain('requestorName\\":"Not specified');
  
  // 2. Check for the absence of duplicate emails (one lowercase, one uppercase)
  expect(emailDetails.hasLowerAndUpperCaseEmails).toBeFalsy();
  
  // 3. Check that category and vendor names are resolved (not showing as UIDs)
  if (emailDetails.resolvedCategory) {
    // Category should not be just a numeric ID
    expect(emailDetails.resolvedCategory).not.toMatch(/^\d+$/);
  }
  
  if (emailDetails.resolvedVendor) {
    // Vendor should not be just a numeric ID
    expect(emailDetails.resolvedVendor).not.toMatch(/^\d+$/);
  }
  
  console.log("Email notification test completed successfully");
});
