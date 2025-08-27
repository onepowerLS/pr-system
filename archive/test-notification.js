// Test script for sendPRNotificationV2 function
const { initializeApp } = require('firebase/app');
const { getFunctions, httpsCallable, connectFunctionsEmulator } = require('firebase/functions');
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');

// Your Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDQxLDGKYvvlvLHOLFfnqJqCsYfTlJhZYE",
  authDomain: "pr-system-4ea55.firebaseapp.com",
  projectId: "pr-system-4ea55",
  storageBucket: "pr-system-4ea55.appspot.com",
  messagingSenderId: "1021899528906",
  appId: "1:1021899528906:web:b9b3c4b2e2c5b9b9b9b9b9"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const functions = getFunctions(app);
const auth = getAuth(app);

// Test function
async function testNotification() {
  try {
    // Sign in (replace with your test credentials)
    await signInWithEmailAndPassword(auth, "test@example.com", "password");
    
    // Get the function
    const sendPRNotificationV2 = httpsCallable(functions, 'sendPRNotificationV2');
    
    // Test data
    const testData = {
      notification: {
        type: 'STATUS_CHANGE',
        prId: 'test-pr-id',
        prNumber: 'PR-TEST-001',
        oldStatus: null,
        newStatus: 'SUBMITTED',
        metadata: {
          isUrgent: true,
          requestorEmail: 'jopi@1pwrafrica.com'
        }
      },
      recipients: ['mso@1pwrafrica.com'],
      cc: ['jopi@1pwrafrica.com'],
      emailBody: {
        subject: 'TEST: New PR Notification',
        text: 'This is a test notification for a new PR submission.',
        html: '<h1>Test Notification</h1><p>This is a test notification for a new PR submission.</p>'
      }
    };
    
    console.log('Calling sendPRNotificationV2 with data:', JSON.stringify(testData, null, 2));
    
    // Call the function
    const result = await sendPRNotificationV2(testData);
    console.log('Function result:', result.data);
    
    console.log('Test completed successfully!');
  } catch (error) {
    console.error('Error testing notification:', error);
  }
}

// Run the test
testNotification();
