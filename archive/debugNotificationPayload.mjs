import { initializeApp } from 'firebase/app';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getFirestore, doc, getDoc } from 'firebase/firestore';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCEH8FHI-JeypGy8g2jtrRyPmRbffeFqjQ",
  authDomain: "pr-system-4ea55.firebaseapp.com",
  projectId: "pr-system-4ea55",
  storageBucket: "pr-system-4ea55.appspot.com",
  messagingSenderId: "1048421695150",
  appId: "1:1048421695150:web:ef19fa9c4bac9694a4a1d9",
  measurementId: "G-GG10JXXZ0P"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const functions = getFunctions(app);
const db = getFirestore(app);

/**
 * Debug the notification payload structure
 * This will help understand why requestorName isn't being transmitted properly
 */
async function debugNotificationPayload() {
  console.log('Running payload structure debug...');
  
  // Create a test payload with all fields explicitly set for clarity
  const testEmail = 'test@example.com';
  const testName = 'Test User';
  
  // First payload - with metadata at the notification level (current structure)
  const payload1 = {
    notification: {
      type: 'DEBUG_TEST',
      prId: 'test-debug-1',
      prNumber: 'PR-TEST-1',
      oldStatus: 'DRAFT',
      newStatus: 'SUBMITTED',
      metadata: {
        requestorEmail: testEmail,
        requestorName: testName,
        isUrgent: false
      }
    },
    recipients: ['msososo@gmail.com'],
    emailBody: {
      subject: 'DEBUG - Current Payload Structure',
      text: 'Testing the current payload structure',
      html: '<p>Testing with <strong>Unknown</strong> placeholder</p>'
    }
  };
  
  // Second payload - with metadata at the root level
  const payload2 = {
    notification: {
      type: 'DEBUG_TEST',
      prId: 'test-debug-2',
      prNumber: 'PR-TEST-2',
      oldStatus: 'DRAFT',
      newStatus: 'SUBMITTED'
    },
    metadata: {
      requestorEmail: testEmail,
      requestorName: testName,
      isUrgent: false
    },
    recipients: ['msososo@gmail.com'],
    emailBody: {
      subject: 'DEBUG - Alternative Payload Structure',
      text: 'Testing an alternative payload structure',
      html: '<p>Testing with <strong>Unknown</strong> placeholder</p>'
    }
  };
  
  // Third payload - with metadata fully flattened
  const payload3 = {
    notification: {
      type: 'DEBUG_TEST',
      prId: 'test-debug-3',
      prNumber: 'PR-TEST-3',
      oldStatus: 'DRAFT',
      newStatus: 'SUBMITTED'
    },
    requestorEmail: testEmail,
    requestorName: testName,
    isUrgent: false,
    recipients: ['msososo@gmail.com'],
    emailBody: {
      subject: 'DEBUG - Flattened Structure',
      text: 'Testing a flattened structure',
      html: '<p>Testing with <strong>Unknown</strong> placeholder</p>'
    }
  };
  
  console.log('Sending test payloads to diagnose structure issue...');
  
  try {
    const sendPRNotificationV2 = httpsCallable(functions, 'sendPRNotificationV2');
    
    console.log('=== SENDING PAYLOAD 1 (current structure) ===');
    console.log(JSON.stringify(payload1, null, 2));
    
    try {
      const result1 = await sendPRNotificationV2(payload1);
      console.log('Result 1:', result1.data);
    } catch (error) {
      console.error('Error with payload 1:', error);
    }
    
    console.log('\n=== SENDING PAYLOAD 2 (metadata at root) ===');
    console.log(JSON.stringify(payload2, null, 2));
    
    try {
      const result2 = await sendPRNotificationV2(payload2);
      console.log('Result 2:', result2.data);
    } catch (error) {
      console.error('Error with payload 2:', error);
    }
    
    console.log('\n=== SENDING PAYLOAD 3 (flattened) ===');
    console.log(JSON.stringify(payload3, null, 2));
    
    try {
      const result3 = await sendPRNotificationV2(payload3);
      console.log('Result 3:', result3.data);
    } catch (error) {
      console.error('Error with payload 3:', error);
    }
    
    console.log('\nTest completed. Check the logs in Firebase to see which structure works.');
    
  } catch (error) {
    console.error('Fatal error:', error);
  }
}

// Run the function
debugNotificationPayload();
