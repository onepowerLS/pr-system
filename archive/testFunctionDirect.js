/**
 * Test script to directly invoke the notification function locally
 */
const functions = require('firebase-functions-test')({
  projectId: 'pr-system-4ea55',
}, '/Users/mattmso/Projects/pr-system-cloud/service-account.json');

// Require the cloud functions from our code
const myFunctions = require('./index.js');

// Get reference to the function
const sendPRNotification = myFunctions.sendPRNotification;

// Example PR data for testing
const testPR = {
  id: 'test-pr-id-' + Date.now(),
  prNumber: 'PR-TEST-' + Date.now(),
  user: {
    id: 'test-requestor-id',
    name: 'Test Requestor',
    email: 'test-requestor@1pwrafrica.com'
  },
  notes: 'This is a test PR from the testDirectCall script',
  metadata: {
    project: 'Test Project',
    department: 'IT',
    estimatedAmount: 1000
  },
  recipients: {
    to: ['mso@1pwrafrica.com'],
    cc: ['mso@1pwr.com']
  },
  emailContent: {
    subject: 'Test Notification: New PR Submitted',
    body: `
      <h1>New PR Submitted</h1>
      <p>PR Number: PR-TEST-${Date.now()}</p>
      <p>Requestor: Test Requestor</p>
      <p>Project: Test Project</p>
      <p>Department: IT</p>
      <p>Amount: 1000</p>
      <p>Notes: This is a test PR from the testDirectCall script</p>
    `
  }
};

// Call the wrapped function with test data
const wrapped = functions.wrap(sendPRNotification);
wrapped(testPR)
  .then(result => {
    console.log('Function executed successfully!');
    console.log('Result:', result);
  })
  .catch(error => {
    console.error('Error:', error);
  })
  .finally(() => {
    // Clean up
    functions.cleanup();
  });
