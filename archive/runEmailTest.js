// Simple test script that requires the compiled JS files
const path = require('path');
const fs = require('fs');

// Check if the dist directory exists
if (!fs.existsSync(path.join(__dirname, '../../dist'))) {
  console.error('Error: You need to build the project first with "npm run build"');
  process.exit(1);
}

async function runTest() {
  try {
    // Dynamically import the compiled modules
    const { testEmailNotifications } = await import('../../dist/utils/testEmailNotifications.js');
    const { logger } = await import('../../dist/utils/logger.js');
    
    logger.info('Starting email notification test...');
    
    // Test with a few different email formats
    const testEmails = [
      'jopi@1pwrafrica.com',
      'john.doe@example.com',
      'jane.smith@company.org',
      'test.user.name@domain.com'
    ];
    
    for (const email of testEmails) {
      console.log(`\n----- Testing email formatting for: ${email} -----`);
      
      try {
        const result = await testEmailNotifications.testEmailNameFormatting(email);
        
        console.log(`Success: ${result.success ? 'YES' : 'NO'}`);
        console.log(`Expected name: ${result.data?.expectedFormattedName}`);
        console.log(`Contains expected name: ${result.data?.containsFormattedName ? 'YES' : 'NO'}`);
        console.log(`Contains "Unknown": ${result.data?.containsUnknown ? 'YES' : 'NO'}`);
        console.log(`Message: ${result.message}`);
        
      } catch (error) {
        console.error(`Failed to test ${email}:`, error);
      }
      
      console.log('------------------------------------------');
    }
    
    console.log('\nEmail notification test completed');
  } catch (error) {
    console.error('Failed to import required modules:', error);
    process.exit(1);
  }
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
