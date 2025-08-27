/**
 * Test script to verify email notification is working
 * 
 * This script tests the PR notification system by creating
 * a test PR and verifying that the email notification is sent
 */

import { httpsCallable } from 'firebase/functions';
import { initializeApp } from 'firebase/app';
import { getFunctions } from 'firebase/functions';
import { auth } from '../config/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyDEIuUJi1kAQNwgWJzlc8GStg4ZWdNtRyc",
  authDomain: "pr-system-4ea55.firebaseapp.com",
  projectId: "pr-system-4ea55",
  storageBucket: "pr-system-4ea55.appspot.com",
  messagingSenderId: "916482097349",
  appId: "1:916482097349:web:d45f96b73e4ddca47fead9"
};

const app = initializeApp(firebaseConfig);
const functions = getFunctions(app);

const sendPRNotificationV2 = httpsCallable(functions, 'sendPRNotificationV2');

async function testEmailNotification() {
  try {
    console.log('Starting email notification test...');
    
    // First, ensure we're authenticated (required for the cloud function)
    try {
      // Use a test account or your admin account here
      await signInWithEmailAndPassword(auth, 'test@example.com', 'password');
      console.log('Authentication successful');
    } catch (error) {
      console.error('Authentication failed:', error);
      throw new Error('Authentication required to run this test');
    }
    
    // Create test notification data
    const testData = {
      notification: {
        type: 'PR_CREATED',
        prId: 'test-pr-' + Date.now(),
        prNumber: 'TEST-' + Date.now(),
        oldStatus: '',
        newStatus: 'SUBMITTED',
        metadata: {
          isUrgent: false,
          requestorEmail: 'test@example.com'
        }
      },
      recipients: ['procurement@1pwrafrica.com'],
      cc: ['test@example.com'],
      emailBody: {
        subject: 'TEST - New PR Submitted',
        text: 'This is a test email for PR notification',
        html: '<h1>Test Email</h1><p>This is a test email for PR notification</p>'
      },
      metadata: {
        prUrl: 'http://localhost:5173/pr/test-pr-123',
        requestorEmail: 'test@example.com'
      }
    };
    
    console.log('Calling sendPRNotificationV2 function with test data');
    
    // Call the function directly
    const result = await sendPRNotificationV2(testData);
    
    console.log('Email notification test completed successfully', result);
  } catch (error) {
    console.error('Email notification test failed:', error);
  }
}

// Run the test
testEmailNotification();
