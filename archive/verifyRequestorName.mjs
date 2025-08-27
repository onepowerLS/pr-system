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
 * Test the notification with proper requestorName handling
 * This demonstrates our generalized, non-hardcoded solution
 */
async function verifyRequestorName() {
  console.log('Verifying requestorName handling in notifications...');
  
  // Define test data with explicit requestorName
  const testName = 'Test Requester';
  const testEmail = 'test@example.com';
  
  // Create a payload with proper metadata structure
  const payload = {
    notification: {
      type: 'VERIFICATION_TEST',
      prId: 'verification-test',
      prNumber: 'PR-VERIFY-001',
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
      subject: 'Verification - Requestor Name Test',
      text: 'This email tests that the requestor name is properly extracted and used',
      html: '<p>This tests that <strong>Unknown</strong> is properly replaced with the requestor name.</p>'
    }
  };
  
  console.log('Sending verification payload...');
  console.log(JSON.stringify(payload, null, 2));
  
  try {
    const sendPRNotificationV2 = httpsCallable(functions, 'sendPRNotificationV2');
    const result = await sendPRNotificationV2(payload);
    
    console.log('Notification sent successfully!');
    console.log('Response data:', result.data);
    console.log('\nCheck your email and the Firebase logs to verify that:');
    console.log(`1. The requestor name "${testName}" appears in the email`);
    console.log('2. There are no instances of "Unknown" in the email');
    console.log('3. The logs show successful extraction of requestorName from notification.metadata');
    
  } catch (error) {
    console.error('Error sending notification:', error);
  }
}

// Run the verification
verifyRequestorName();
