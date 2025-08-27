import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';

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
const db = getFirestore(app);
const auth = getAuth(app);

// PR Status enum
const PRStatus = {
  DRAFT: 'DRAFT',
  SUBMITTED: 'SUBMITTED',
  PENDING_APPROVAL: 'PENDING_APPROVAL',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  REVISION_REQUIRED: 'REVISION_REQUIRED',
  RESUBMITTED: 'RESUBMITTED',
  CANCELED: 'CANCELED',
  CLOSED: 'CLOSED'
};

/**
 * Create a test purchase request to verify notification functionality
 */
async function createTestPR() {
  console.log('Starting test PR creation...');
  
  try {
    // Sign in with test user credentials first
    await signInWithEmailAndPassword(auth, 'jopi@1pwrafrica.com', 'password123');
    console.log('Signed in as test user');
    
    // User data for the requestor
    const user = {
      id: 'testuser123',
      email: 'jopi@1pwrafrica.com',
      name: 'Leoma Jopi', // This is the name that should appear in notifications
      firstName: 'Leoma',
      lastName: 'Jopi',
      department: 'admin',
      site: 'ketane'
    };
    
    // Create a test PR in draft status first
    const prData = {
      status: PRStatus.DRAFT,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      requestor: user,
      requestorEmail: user.email,
      department: user.department,
      site: user.site,
      category: '2_engineering_r_d',
      expenseType: 'reimbursable',
      isUrgent: false,
      requiredDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      approver: null,
      approvers: ['procurement@1pwrafrica.com'],
      lineItems: [
        {
          id: '1',
          description: 'Test item for notification',
          quantity: 1,
          unit: 'each',
          unitPrice: 100,
          currency: 'LSL',
          totalPrice: 100
        }
      ],
      subtotal: 100,
      tax: 0,
      total: 100,
      notes: 'This is a test PR for notification validation',
      approvalWorkflow: {
        currentApprover: null,
        approvalHistory: [],
        lastUpdated: new Date().toISOString()
      }
    };
    
    // Add the PR to Firestore
    const prRef = await addDoc(collection(db, 'purchaseRequests'), prData);
    console.log(`Created draft PR with ID: ${prRef.id}`);
    
    // Update the PR to submitted status to trigger notification
    await updateDoc(doc(db, 'purchaseRequests', prRef.id), {
      status: PRStatus.SUBMITTED,
      updatedAt: serverTimestamp(),
      submittedAt: serverTimestamp(),
      'approvalWorkflow.currentApprover': 'procurement@1pwrafrica.com'
    });
    
    console.log(`Updated PR ${prRef.id} to SUBMITTED status, notification should be triggered`);
    console.log('Test complete! Check email for notification with proper requestor name.');
    
  } catch (error) {
    console.error('Error creating test PR:', error);
  }
}

// Run the test
createTestPR();
