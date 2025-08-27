import { initializeApp } from 'firebase/app';
import { getFunctions, httpsCallable } from 'firebase/functions';

// Firebase configuration - make sure to replace with your actual config
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

/**
 * Test notification with explicit requestorName in metadata
 */
async function testNotificationWithRequestorName() {
  console.log('Starting test notification with explicit requestorName...');
  
  try {
    const sendPRNotificationV2 = httpsCallable(functions, 'sendPRNotificationV2');
    
    // The requestor name we want to ensure appears in the email
    const testRequestorName = 'Leoma Jopi';
    const testEmail = 'jopi@1pwrafrica.com';
    
    // Create a minimal test PR ID (just for testing)
    const testPrId = `test-${new Date().getTime()}`;
    
    // Sample HTML with "Unknown" placeholder that should be replaced
    const sampleHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>New Purchase Request Submitted</h2>
        <p>A new purchase request has been submitted by <strong>Unknown</strong>.</p>
        
        <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
          <tr style="background-color: #f2f2f2;">
            <td style="padding: 8px; border: 1px solid #ddd"><strong>PR Number</strong></td>
            <td style="padding: 8px; border: 1px solid #ddd">PR-TEST-123</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd"><strong>Name</strong></td>
            <td style="padding: 8px; border: 1px solid #ddd">Unknown</td>
          </tr>
          <tr style="background-color: #f2f2f2;">
            <td style="padding: 8px; border: 1px solid #ddd"><strong>Email</strong></td>
            <td style="padding: 8px; border: 1px solid #ddd">${testEmail}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd"><strong>Submitted By</strong></td>
            <td style="padding: 8px; border: 1px solid #ddd">PR Requestor</td>
          </tr>
        </table>
        
        <p style="margin-top: 20px;">Please review and process this request.</p>
        <p>Thank you.</p>
      </div>
    `;
    
    // Call the Cloud Function with the test data
    const result = await sendPRNotificationV2({
      notification: {
        type: 'TEST_NOTIFICATION',
        prId: testPrId,
        prNumber: 'PR-TEST-123',
        oldStatus: 'DRAFT',
        newStatus: 'SUBMITTED',
        metadata: {
          isUrgent: true,
          requestorEmail: testEmail,
          requestorName: testRequestorName
        }
      },
      recipients: ['msososo@gmail.com'], // Replace with your email for testing
      emailBody: {
        subject: 'TEST - Name Fix Validation',
        text: 'This is a test to validate the requestor name fix.',
        html: sampleHtml
      }
    });
    
    console.log('Test notification sent successfully!');
    console.log('Result:', result.data);
  } catch (error) {
    console.error('Error sending test notification:', error);
  }
}

// Run the test
testNotificationWithRequestorName();
