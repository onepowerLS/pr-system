/**
 * Test script to send a notification for an existing PR 
 * to verify approver information is included correctly
 */
import { auth, db } from '../config/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { submitPRNotification } from '../services/notifications/handlers/submitPRNotification';
import { logger } from '../utils/logger';

// The PR ID from the email you shared
const PR_ID = 'UN9HeoDlH3XPOQcyTfbR';

async function testExistingPR() {
  try {
    // Login first - replace with your credentials if needed
    logger.info('Signing in...');
    await signInWithEmailAndPassword(auth, 'mso@1pwr.com', 'test-password-here');
    
    logger.info(`Testing notification for PR ID: ${PR_ID}`);
    
    // Get the PR data
    const prRef = doc(db, 'purchaseRequests', PR_ID);
    const prSnapshot = await getDoc(prRef);
    
    if (!prSnapshot.exists()) {
      logger.error('PR not found');
      return;
    }
    
    const prData = prSnapshot.data();
    
    // Enhanced logging to debug the approver information
    logger.info('Retrieved PR data with the following approver information:', { 
      prNumber: prData.prNumber,
      legacyApprover: prData.approver,
      hasWorkflow: !!prData.approvalWorkflow,
      currentApprover: typeof prData.approvalWorkflow?.currentApprover === 'object' 
        ? {
            id: prData.approvalWorkflow.currentApprover.id,
            name: prData.approvalWorkflow.currentApprover.name,
            email: prData.approvalWorkflow.currentApprover.email
          }
        : prData.approvalWorkflow?.currentApprover,
      approvalHistory: prData.approvalWorkflow?.approvalHistory || []
    });
    
    // Set the PR ID explicitly
    const prWithId = { ...prData, id: PR_ID };
    
    // Send notification
    logger.info('Sending notification...');
    await submitPRNotification.createNotification(prWithId, prData.prNumber);
    
    logger.info('Notification sent successfully!');
    
    // Display important note
    logger.info('NOTE: We updated the notification format to properly include approver information. ' +
                'The PR emails should now show the correct approver details.');
    
  } catch (error) {
    logger.error('Error testing PR notification:', error);
  }
}

// Execute the test
testExistingPR().catch(err => {
  logger.error('Script failed:', err);
  process.exit(1);
});
