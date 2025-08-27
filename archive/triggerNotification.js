/**
 * Script to trigger a notification by directly writing to the notifications collection
 */
const admin = require('firebase-admin');

// Initialize Firebase Admin (with application default credentials)
admin.initializeApp();

// Get a reference to Firestore
const db = admin.firestore();

// Create a notification document
async function createNotification() {
  try {
    console.log('Creating notification document...');
    
    // Create a timestamp
    const now = admin.firestore.Timestamp.now();
    
    // Create notification data
    const notificationData = {
      prId: 'test-pr-id-' + Date.now(),
      prNumber: 'PR-TEST-' + Date.now(),
      user: {
        id: 'test-requestor-id',
        name: 'Test Requestor',
        email: 'test-requestor@1pwrafrica.com'
      },
      notes: 'This is a test PR from the triggerNotification script',
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
          <p>Notes: This is a test PR from the triggerNotification script</p>
        `
      },
      status: 'PENDING',
      createdAt: now,
      type: 'PR_SUBMITTED'
    };
    
    // Add to Firestore
    const docRef = await db.collection('notifications').add(notificationData);
    
    console.log('Created notification document with ID:', docRef.id);
    console.log('Check Firebase logs to see if the notification was processed');
  } catch (error) {
    console.error('Error creating notification:', error);
  }
}

// Run the script
createNotification()
  .then(() => {
    console.log('Script completed');
    process.exit(0);
  })
  .catch(error => {
    console.error('Script failed:', error);
    process.exit(1);
  });
