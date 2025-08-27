/**
 * Test script to directly call the notification cloud function
 */
import { functions } from '../config/firebase';
import { httpsCallable } from 'firebase/functions';

// Example PR data for testing
const testPR = {
  id: 'test-pr-id-' + Date.now(),
  prNumber: 'PR-TEST-' + Date.now(),
  requestor: {
    id: 'test-requestor-id',
    name: 'Test Requestor',
    email: 'test-requestor@1pwrafrica.com'
  },
  notes: 'This is a test PR from the testCloudFunction script',
  metadata: {
    project: 'Test Project',
    department: 'IT',
    estimatedAmount: 1000
  }
};

// Example recipients data
const recipients = {
  to: ['approver@1pwrafrica.com'],
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
    const sendPRNotificationV2 = httpsCallable(functions, 'sendPRNotificationV2');
    const result = await sendPRNotificationV2(payload);
    
    console.log('Cloud function executed successfully!');
    console.log('Result:', result);
  } catch (error) {
    console.error('Error calling cloud function:', error);
  }
}

// Execute the test
testNotificationFunction().catch(console.error);
