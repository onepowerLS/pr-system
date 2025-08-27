/**
 * Test script to directly call the notification cloud function
 */
const { initializeApp } = require('firebase/app');
const { getFunctions, httpsCallable } = require('firebase/functions');

// Firebase configuration with actual values
const firebaseConfig = {
  apiKey: "AIzaSyD0tA1fvWs5dCr-7JqJv_bxlay2Bhs72jQ",
  authDomain: "pr-system-4ea55.firebaseapp.com",
  projectId: "pr-system-4ea55",
  storageBucket: "pr-system-4ea55.firebasestorage.app",
  messagingSenderId: "562987209098",
  appId: "1:562987209098:web:2f788d189f1c0867cb3873",
  measurementId: "G-ZT7LN4XP80"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const functions = getFunctions(app, 'us-central1');

// Example PR data for testing
const testPR = {
  id: 'test-pr-id-' + Date.now(),
  prNumber: 'PR-TEST-' + Date.now(),
  requestor: {
    id: 'test-requestor-id',
    name: 'Test Requestor',
    email: 'test-requestor@1pwrafrica.com'
  },
  notes: 'This is a test PR from the testDirectCall script',
  metadata: {
    project: 'Test Project',
    department: 'IT',
    estimatedAmount: 1000
  }
};

// Example recipients data
const recipients = {
  to: ['mso@1pwrafrica.com'],
  cc: ['mso@1pwr.com']
};

// Example email content
const emailContent = {
  subject: 'Test Notification: New PR Submitted',
  body: `
    <h1>New PR Submitted</h1>
    <p>PR Number: ${testPR.prNumber}</p>
    <p>Requestor: ${testPR.requestor.name}</p>
    <p>Project: ${testPR.metadata.project}</p>
    <p>Department: ${testPR.metadata.department}</p>
    <p>Amount: ${testPR.metadata.estimatedAmount}</p>
    <p>Notes: ${testPR.notes}</p>
  `
};

async function testNotificationFunction() {
  try {
    console.log('Calling cloud function...');
    
    // Create the payload in the correct format - flattened structure
    const payload = {
      prId: testPR.id,
      prNumber: testPR.prNumber,
      user: testPR.requestor,
      notes: testPR.notes,
      metadata: testPR.metadata,
      recipients: recipients,
      emailContent: emailContent
    };
    
    console.log('Payload:', JSON.stringify(payload, null, 2));
    
    // Call the cloud function
    const sendPRNotification = httpsCallable(functions, 'sendPRNotification');
    const result = await sendPRNotification(payload);
    
    console.log('Cloud function executed successfully!');
    console.log('Result:', result);
  } catch (error) {
    console.error('Error calling cloud function:', error);
  }
}

// Execute the test
testNotificationFunction().catch(console.error);
