/**
 * Browser Console Scripts for PR System
 * 
 * These scripts can be run in the browser console to perform various tasks:
 * 1. Test email notifications
 * 2. Delete Draft PRs
 * 
 * Instructions:
 * 1. Log in to the PR System in your browser
 * 2. Open the browser console (F12 or right-click > Inspect > Console)
 * 3. Copy and paste the desired function from this file
 * 4. Call the function in the console
 */

/**
 * Send a test email using the sendPRNotificationV2 function
 * This function can be used in the browser console for testing
 */
function testEmail(recipient = 'procurement@1pwrafrica.com', cc = []) {
  // Get the functions instance
  const functions = firebase.functions();
  
  // Get the sendPRNotificationV2 function
  const sendPRNotificationV2 = functions.httpsCallable('sendPRNotificationV2');
  
  // Prepare payload
  const payload = {
    notification: {
      type: 'PR_CREATED',
      prId: 'test-pr-' + Date.now(),
      prNumber: 'TEST-' + Date.now(),
      oldStatus: null,
      newStatus: 'SUBMITTED',
      metadata: {
        isUrgent: false,
        requestorEmail: 'test@example.com'
      }
    },
    recipients: [recipient],
    cc: cc,
    emailBody: {
      subject: 'Test PR Email Notification',
      text: `This is a test email from the PR System. PR Number: TEST-${Date.now()} Status: SUBMITTED`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">PR System Test Email</h2>
          <p>This is a test email from the PR system.</p>
          <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd; background-color: #f2f2f2;"><strong>PR Number</strong></td>
              <td style="padding: 8px; border: 1px solid #ddd;">TEST-${Date.now()}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd; background-color: #f2f2f2;"><strong>Status</strong></td>
              <td style="padding: 8px; border: 1px solid #ddd;">SUBMITTED</td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd; background-color: #f2f2f2;"><strong>Name</strong></td>
              <td style="padding: 8px; border: 1px solid #ddd;"></td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd; background-color: #f2f2f2;"><strong>Vendor</strong></td>
              <td style="padding: 8px; border: 1px solid #ddd;">1033</td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd; background-color: #f2f2f2;"><strong>Category</strong></td>
              <td style="padding: 8px; border: 1px solid #ddd;">4_minigrids</td>
            </tr>
          </table>
          <p style="margin-top: 20px;">This email was sent automatically by the PR system. Please do not reply.</p>
        </div>
      `
    }
  };
  
  console.log('Sending test email with payload:', payload);
  
  // Call the function
  return sendPRNotificationV2(payload)
    .then(result => {
      console.log('Email sent successfully!', result);
      return result;
    })
    .catch(error => {
      console.error('Error sending email:', error);
      throw error;
    });
}

/**
 * Delete all PRs with Draft status
 * 
 * This function deletes all PRs with status 'DRAFT' from the database.
 * It uses batched writes for efficiency.
 */
async function deleteDraftPRs() {
  // Get Firestore instance
  const db = firebase.firestore();
  const PR_COLLECTION = 'purchaseRequests';
  
  console.log('Starting deletion of DRAFT PRs...');
  
  try {
    // Query all PRs with status 'DRAFT'
    console.log('Querying DRAFT PRs...');
    const snapshot = await db.collection(PR_COLLECTION)
      .where('status', '==', 'DRAFT')
      .get();
    
    if (snapshot.empty) {
      console.log('No DRAFT PRs found.');
      return;
    }
    
    const prCount = snapshot.docs.length;
    console.log(`Found ${prCount} DRAFT PRs to delete.`);
    
    // Create a batch for efficient deletion
    const batchSize = 500; // Firestore batch limit is 500
    let batch = db.batch();
    let count = 0;
    let totalDeleted = 0;
    
    // Add each document to the batch
    snapshot.forEach(doc => {
      batch.delete(doc.ref);
      count++;
      
      // When we reach the batch limit, commit and create a new batch
      if (count >= batchSize) {
        console.log(`Committing batch of ${count} deletions...`);
        batch.commit();
        totalDeleted += count;
        count = 0;
        batch = db.batch();
      }
    });
    
    // Commit any remaining deletes
    if (count > 0) {
      console.log(`Committing final batch of ${count} deletions...`);
      await batch.commit();
      totalDeleted += count;
    }
    
    console.log(`Successfully deleted ${totalDeleted} DRAFT PRs.`);
    return totalDeleted;
  } catch (error) {
    console.error('Error deleting DRAFT PRs:', error);
    throw error;
  }
}

// Export the functions for use in the browser console
// Just copy and paste the function you want to use
console.log('PR System Browser Console Scripts loaded!');
console.log('Available functions:');
console.log('1. testEmail() - Test email notifications');
console.log('2. deleteDraftPRs() - Delete all PRs with Draft status');
