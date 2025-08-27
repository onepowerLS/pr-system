import { getFunctions, httpsCallable } from 'firebase/functions';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { app, auth, functions } from '../config/firebase';

async function main() {
  try {
    // Login first
    console.log('Signing in...');
    await signInWithEmailAndPassword(auth, 'mso@1pwr.com', 'your-password-here');
    
    console.log('Signed in successfully!');
    
    // Call the cloud function
    const sendPRNotificationV2 = httpsCallable(functions, 'sendPRNotificationV2');
    
    const result = await sendPRNotificationV2({
      prId: 'test-pr-id',
      prNumber: 'PR-202502-064',
      user: {
        email: 'test@example.com',
        name: 'Test User'
      },
      notes: 'This is a test notification',
      metadata: {
        isUrgent: true,
        requestorEmail: 'test@example.com',
        approvalWorkflow: {
          currentApprover: {
            id: 'approver-id',
            email: 'approver@example.com',
            name: 'Test Approver'
          }
        },
        department: 'Test Department',
        amount: 100,
        currency: 'USD'
      },
      recipients: {
        to: ['mso@1pwr.com'],
        cc: ['mso+cc@1pwr.com']
      },
      emailContent: {
        subject: 'Test Notification',
        text: 'This is a test notification',
        html: '<h1>Test Notification</h1><p>This is a test notification</p>'
      }
    });
    
    console.log('Notification sent!', result);
  } catch (error) {
    console.error('Error:', error);
  }
}

main().catch(console.error);
