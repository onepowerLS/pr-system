import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';
import { firebaseConfig } from '../config/firebase';
import { submitPRNotification } from '../services/notifications/handlers/submitPRNotification';
import { logger } from '../utils/logger';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

/**
 * Test script to verify that approver information is correctly included in PR notifications
 */
async function testApproverNotification() {
  try {
    // Replace with a valid PR ID from your system
    const prId = 'UN9HeoDlH3XPOQcyTfbR'; // Use the PR ID from the email you shared
    const prRef = doc(db, 'purchaseRequests', prId);
    
    // Get the PR data
    const prSnapshot = await getDoc(prRef);
    if (!prSnapshot.exists()) {
      logger.error('PR not found');
      return;
    }
    
    const prData = prSnapshot.data();
    const prNumber = prData.prNumber || 'TEST-PR';
    
    logger.info('Starting notification test for PR:', { prId, prNumber });
    logger.info('Current PR data:', {
      approver: prData.approver,
      approvalWorkflow: prData.approvalWorkflow,
      hasLegacyApprover: !!prData.approver,
      hasApprovalWorkflow: !!prData.approvalWorkflow
    });
    
    // Make sure we have a valid approvalWorkflow structure
    if (!prData.approvalWorkflow) {
      logger.info('PR does not have an approvalWorkflow structure, creating one');
      
      // Create a minimal approvalWorkflow structure
      const approvalWorkflow = {
        currentApprover: prData.approver || 'V1TZMqnlDaWMF2BWRDppGlHqZv12', // Replace with a valid user ID if needed
        approvalHistory: [],
        lastUpdated: Timestamp.fromDate(new Date())
      };
      
      // Update the PR with the new approvalWorkflow
      await setDoc(prRef, { approvalWorkflow }, { merge: true });
      logger.info('Updated PR with approvalWorkflow structure:', { approvalWorkflow });
      
      // Re-fetch the PR data
      const updatedPrSnapshot = await getDoc(prRef);
      prData.approvalWorkflow = updatedPrSnapshot.data().approvalWorkflow;
    }
    
    // Send the notification
    logger.info('Sending test notification with current PR data');
    await submitPRNotification.createNotification(prData, prNumber);
    
    logger.info('Test notification sent successfully');
  } catch (error) {
    logger.error('Error in test script:', error);
  }
}

// Run the test
testApproverNotification().then(() => {
  logger.info('Test script completed');
  process.exit(0);
}).catch((error) => {
  logger.error('Test script failed:', error);
  process.exit(1);
});
