/**
 * Email Test Runner with Environment Variables (ESM version)
 * 
 * This script sets the environment variables and runs the email test
 * Using functional programming patterns as per project guidelines
 */

import { spawn } from 'child_process';

// Function to set environment variables for testing
function setupEnvironmentVariables() {
  // Set Firebase configuration
  process.env.VITE_FIREBASE_API_KEY = 'AIzaSyD0tA1fvWs5dCr-7JqJv_bxlay2Bhs72jQ';
  process.env.VITE_FIREBASE_AUTH_DOMAIN = 'pr-system-4ea55.firebaseapp.com';
  process.env.VITE_FIREBASE_PROJECT_ID = 'pr-system-4ea55';
  process.env.VITE_FIREBASE_STORAGE_BUCKET = 'pr-system-4ea55.firebasestorage.app';
  process.env.VITE_FIREBASE_MESSAGING_SENDER_ID = '562987209098';
  process.env.VITE_FIREBASE_APP_ID = '1:562987209098:web:2f788d189f1c0867cb3873';
  process.env.VITE_FIREBASE_MEASUREMENT_ID = 'G-ZT7LN4XP80';
  
  // Set test credentials
  process.env.VITE_TEST_EMAIL = 'mso@1pwrafrica.com';
  process.env.VITE_TEST_PASSWORD = '1PWR00';
  
  return process.env;
}

// Function to run the email test with proper environment
function runEmailTest() {
  console.log('🚀 Setting environment variables and running email test...');
  
  // Use enhanced env with our variables
  const enhancedEnv = setupEnvironmentVariables();
  
  // Run the test script with the environment variables
  const testProcess = spawn('npx', ['tsx', 'src/scripts/testEmails.ts'], {
    stdio: 'inherit',
    env: enhancedEnv
  });
  
  return new Promise((resolve, reject) => {
    testProcess.on('close', (code) => {
      if (code === 0) {
        console.log('✅ Email test completed successfully');
        resolve();
      } else {
        console.error(`❌ Email test failed with code ${code}`);
        reject(new Error(`Process exited with code ${code}`));
      }
    });
    
    testProcess.on('error', (err) => {
      console.error('❌ Failed to start test process:', err);
      reject(err);
    });
  });
}

// Main function - run the test
async function main() {
  try {
    await runEmailTest();
  } catch (error) {
    console.error('Error running test:', error);
    process.exit(1);
  }
}

// Execute main function
main();
