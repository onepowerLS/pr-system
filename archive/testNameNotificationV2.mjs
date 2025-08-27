import { initializeApp } from 'firebase/app';
import { getFunctions, httpsCallable } from 'firebase/functions';

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
    
    // Email content that exactly matches the structure used in live emails
    const sampleHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #333; margin-bottom: 30px;">New Purchase Request #PR-TEST-123 Submitted</h2>
        <div style="margin-bottom: 30px;">
          <h3 style="color: #444; margin-bottom: 15px;">Submission Details</h3>
          <p style="margin: 10px 0; line-height: 1.5;"><strong>Submitted By:</strong> Unknown</p>
        </div>

        <div style="margin-bottom: 30px;">
          <h3 style="color: #444; margin-bottom: 15px;">Requestor Information</h3>
          <table style="border-collapse: collapse; width: 100%; margin-bottom: 30px;">
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd"><strong>Name</strong></td>
              <td style="padding: 8px; border: 1px solid #ddd">Unknown</td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd"><strong>Email</strong></td>
              <td style="padding: 8px; border: 1px solid #ddd">${testEmail}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd"><strong>Department</strong></td>
              <td style="padding: 8px; border: 1px solid #ddd">admin</td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd"><strong>Site</strong></td>
              <td style="padding: 8px; border: 1px solid #ddd">ketane</td>
            </tr>
          </table>
        </div>

        <div style="margin-top: 30px; text-align: center;">
          <a href="http://localhost:5173/pr/test123" style="display: inline-block; padding: 10px 20px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 4px; font-weight: bold;">View Purchase Request</a>
        </div>
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
        subject: 'TEST - Name Fix Validation V2',
        text: 'This is a test to validate the improved requestor name fix.',
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
