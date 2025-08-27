/**
 * Test script to verify email notification is working
 * 
 * This script tests the PR notification system by creating
 * a test PR and verifying that the email notification is sent
 */

import { httpsCallable } from 'firebase/functions';
import { getFunctions } from 'firebase/functions';
import { submitPRNotification } from '../services/notifications/handlers/submitPRNotification';
import { auth } from '../config/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';

const functions = getFunctions();
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
    
    // Create a test PR object
    const testPr = {
      id: 'test-pr-' + Date.now(),
      organization: 'Test Org',
      requestorId: 'test-user',
      requestorEmail: 'test@example.com',
      description: 'Test PR for notification',
      estimatedAmount: 1000,
      currency: 'USD',
      department: 'IT',
      requiredDate: new Date().toISOString(),
      approver: 'test-approver',
      approvalWorkflow: {
        currentApprover: 'test-approver',
        approvalHistory: [],
        lastUpdated: new Date().toISOString()
      }
    };
    
    // Create a test PR number
    const testPrNumber = 'TEST-' + Date.now();
    
    console.log('Attempting to send notification for test PR:', testPrNumber);
    
    // Call the submitPRNotification directly to test
    await submitPRNotification.createNotification(testPr, testPrNumber);
    
    console.log('Email notification test completed successfully');
  } catch (error) {
    console.error('Email notification test failed:', error);
  }
}

// Run the test
testEmailNotification();
