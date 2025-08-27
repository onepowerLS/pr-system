import { httpsCallable } from 'firebase/functions';
import { initializeApp } from 'firebase/app';
import { getFunctions } from 'firebase/functions';
import { firebaseConfig } from '../config/firebase';

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
      recipients: ['your-test-email@example.com'], // Replace with your email
      emailBody: {
        subject: 'TEST - Name Fix Validation',
        text: 'This is a test to validate the requestor name fix.',
        html: sampleHtml
      }
    });
    
    console.log('Test notification sent successfully!');
    console.log('Result:', result);
  } catch (error) {
    console.error('Error sending test notification:', error);
  }
}

// Run the test
testNotificationWithRequestorName();
