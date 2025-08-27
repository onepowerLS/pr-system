import { testEmailNotifications } from '../utils/testEmailNotifications';
import { logger } from '../utils/logger';

async function runTest() {
  logger.info('Starting email notification test...');
  
  // Test with a few different email formats
  const testEmails = [
    'jopi@1pwrafrica.com',
    'john.doe@example.com',
    'jane.smith@company.org',
    'test.user.name@domain.com'
  ];
  
  for (const email of testEmails) {
    logger.info(`Testing email formatting for: ${email}`);
    
    try {
      const result = await testEmailNotifications.testEmailNameFormatting(email);
      
      logger.info(`Test result for ${email}:`, {
        success: result.success,
        message: result.message,
        data: result.data
      });
      
      console.log(`\n----- Test for ${email} -----`);
      console.log(`Success: ${result.success ? 'YES' : 'NO'}`);
      console.log(`Expected name: ${result.data?.expectedFormattedName}`);
      console.log(`Contains expected name: ${result.data?.containsFormattedName ? 'YES' : 'NO'}`);
      console.log(`Contains "Unknown": ${result.data?.containsUnknown ? 'YES' : 'NO'}`);
      console.log(`Message: ${result.message}`);
      console.log('---------------------------\n');
      
    } catch (error) {
      logger.error(`Error testing ${email}:`, {
        error: error instanceof Error ? error.message : String(error)
      });
      
      console.error(`Failed to test ${email}:`, error);
    }
  }
  
  logger.info('Email notification test completed');
}

// Run the test
runTest()
  .then(() => {
    console.log('All tests completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Test failed with error:', error);
    process.exit(1);
  });
