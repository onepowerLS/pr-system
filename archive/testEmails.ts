#!/usr/bin/env ts-node
/**
 * PR System Email Notification Testing Script
 * 
 * This script provides a convenient way to test email notification functionality
 * without needing to manually create PRs in the UI.
 * 
 * Usage:
 *   npm run test:emails
 *   npm run test:emails -- --case=1  (to run a specific test case)
 *   npm run test:emails -- --use-handler  (to test actual notification sending)
 */

import { runEmailNotificationTests, testSingleCase } from "../utils/testEmailNotifications";
import { logger } from "../utils/logger";

async function main() {
  // Parse command line arguments
  const args = process.argv.slice(2);
  const isUseHandler = args.some(arg => arg === "--use-handler");
  
  // Parse case index if specified
  const caseArg = args.find(arg => arg.startsWith("--case="));
  const caseIndex = caseArg ? parseInt(caseArg.split("=")[1], 10) : -1;
  
  logger.info("🧪 PR Email Notification Test");
  logger.info("==============================");
  
  if (isUseHandler) {
    logger.info("⚠️ Using actual notification handler (will attempt to send emails)");
  } else {
    logger.info("📝 Preview mode (no emails will be sent)");
  }
  
  try {
    if (caseIndex >= 0) {
      logger.info(`Running test case #${caseIndex}`);
      await testSingleCase(caseIndex, isUseHandler);
    } else {
      logger.info("Running all test cases");
      await runEmailNotificationTests(isUseHandler);
    }
    
    logger.info("✅ Tests completed");
  } catch (error) {
    logger.error("❌ Test execution failed:", error);
    process.exit(1);
  }
}

// Execute the main function
main().catch(error => {
  logger.error("Unhandled error:", error);
  process.exit(1);
});
