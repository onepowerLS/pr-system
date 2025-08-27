/**
 * Test script to create a PR and trigger the notification flow
 */
import { auth, db } from '../config/firebase';
import { collection, addDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { submitPRNotification } from '../services/notifications/handlers/submitPRNotification';

// Initialize Firebase
const PR_COLLECTION = 'purchaseRequests';

async function createTestPR() {
  try {
    // Login first - replace with your test credentials
    console.log('Signing in...');
    await signInWithEmailAndPassword(auth, 'mso@1pwr.com', 'test-password-here');
    
    console.log('Creating test PR...');
    
    const user = auth.currentUser;
    
    if (!user) {
      throw new Error('No authenticated user');
    }
    
    const now = Timestamp.now();
    
    // Create a test PR
    const prData = {
      prNumber: `PR-TEST-${new Date().getTime()}`,
      organization: '1PWR LESOTHO',
      requestorId: user.uid,
      requestorEmail: 'test-user@1pwrafrica.com',
      requestor: {
        firstName: 'Test',
        lastName: 'User',
        email: 'test-user@1pwrafrica.com',
        department: 'IT'
      },
      status: 'SUBMITTED',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      createdBy: {
        id: user.uid,
        name: user.displayName || '',
        email: user.email || ''
      },
      updatedBy: {
        id: user.uid,
        name: user.displayName || '',
        email: user.email || ''
      },
      statusHistory: [{
        status: 'SUBMITTED',
        timestamp: now,
        updatedBy: {
          id: user.uid,
          name: user.displayName || '',
          email: user.email || ''
        }
      }],
      project: 'Test Project',
      department: 'IT',
      projectCategory: '2_engineering_r_d',
      currency: 'LSL',
      estimatedAmount: 1000,
      isUrgent: true,
      requiredDate: new Date().toISOString(),
      notes: 'This is a test PR created by script',
      lineItems: [
        {
          description: 'Test Item',
          quantity: 2,
          uom: 'EA',
          notes: 'Test notes',
          attachments: []
        }
      ],
      approvalWorkflow: {
        currentApprover: {
          id: 'test-approver-id',
          name: 'Test Approver',
          email: 'approver@1pwrafrica.com'
        },
        approvalHistory: [],
        lastUpdated: now.toDate().toISOString()
      }
    };
    
    // Create PR in Firestore
    const docRef = await addDoc(collection(db, PR_COLLECTION), prData);
    console.log('Created PR with ID:', docRef.id);
    
    // Add ID to the PR data
    const prWithId = { ...prData, id: docRef.id };
    
    // Send notification manually
    console.log('Sending notification...');
    await submitPRNotification.createNotification(prWithId, prData.prNumber);
    
    console.log('PR created and notification sent successfully!');
  } catch (error) {
    console.error('Error creating test PR:', error);
  }
}

// Execute the test
createTestPR().catch(console.error);
