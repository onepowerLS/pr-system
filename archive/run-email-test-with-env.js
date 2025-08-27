/**
 * Email Test Runner with Environment Variables
 * 
 * This script sets the environment variables and runs the email test
 */

// Set environment variables
process.env.VITE_FIREBASE_API_KEY = 'AIzaSyD0tA1fvWs5dCr-7JqJv_bxlay2Bhs72jQ';
process.env.VITE_FIREBASE_AUTH_DOMAIN = 'pr-system-4ea55.firebaseapp.com';
process.env.VITE_FIREBASE_PROJECT_ID = 'pr-system-4ea55';
process.env.VITE_FIREBASE_STORAGE_BUCKET = 'pr-system-4ea55.firebasestorage.app';
process.env.VITE_FIREBASE_MESSAGING_SENDER_ID = '562987209098';
process.env.VITE_FIREBASE_APP_ID = '1:562987209098:web:2f788d189f1c0867cb3873';
process.env.VITE_FIREBASE_MEASUREMENT_ID = 'G-ZT7LN4XP80';
process.env.VITE_TEST_EMAIL = 'mso@1pwrafrica.com';
process.env.VITE_TEST_PASSWORD = '1PWR00';

// Run the email test script
console.log('Setting environment variables and running email test...');

// Special import hack for ESM modules in Node.js
const { execSync } = require('child_process');

try {
  console.log('Running email test with environment variables...');
  // Execute the test script with the environment variables already set
  execSync('npx tsx src/scripts/testEmails.ts', { 
    stdio: 'inherit',
    env: process.env
  });
} catch (error) {
  console.error('Error running email test:', error);
  process.exit(1);
}
