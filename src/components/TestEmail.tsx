/**
 * TestEmail Component
 * 
 * A component to test different aspects of the email notification system.
 * Provides buttons to test different parts of the notification process.
 */

import React, { useState } from 'react';
import { functions, db } from '../config/firebase';
import { httpsCallable } from 'firebase/functions';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { submitPRNotification } from '../services/notifications/handlers/submitPRNotification';

export function TestEmail() {
  const [isSending, setIsSending] = useState(false);
  const [isCallingSendEmail, setIsCallingSendEmail] = useState(false);
  const [isLoggingToFirestore, setIsLoggingToFirestore] = useState(false);
  const [result, setResult] = useState<{success?: boolean; error?: string; message?: string}>({});

  /**
   * Test the entire notification flow - similar to what happens on PR submission
   */
  const testFullNotificationFlow = async () => {
    setIsSending(true);
    setResult({});
    
    try {
      // Create a test PR
      const testPr = {
        id: 'test-pr-' + Date.now(),
        organization: 'Test Org',
        requestorId: 'test-user',
        requestorEmail: 'mso@1pwr.com', // Use a real email for testing
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
        },
        requestor: {
          firstName: 'Test',
          lastName: 'User',
          email: 'mso@1pwr.com', // Use a real email for testing
          department: 'IT'
        }
      };
      
      // Test PR number
      const testPrNumber = 'TEST-' + Date.now();
      
      console.log('Starting full notification flow test with PR:', testPrNumber);
      
      // Call submitPRNotification directly
      await submitPRNotification.createNotification(testPr, testPrNumber);
      
      setResult({ 
        success: true,
        message: 'Full notification flow test completed. Check console and Firebase logs.'
      });
    } catch (error) {
      console.error('Full notification flow test failed:', error);
      setResult({ 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      });
    } finally {
      setIsSending(false);
    }
  };

  /**
   * Test direct cloud function call to sendPRNotificationV2
   * This will send an email directly without creating a notification document
   */
  const testSendEmailFunction = async () => {
    setIsCallingSendEmail(true);
    setResult({});
    
    try {
      console.log('Calling sendPRNotificationV2 function directly');
      
      const sendPRNotificationV2 = httpsCallable(functions, 'sendPRNotificationV2');
      
      // Prepare test data
      const testData = {
        notification: {
          type: 'PR_CREATED',
          prId: 'test-pr-' + Date.now(),
          prNumber: 'TEST-' + Date.now(),
          oldStatus: null,
          newStatus: 'SUBMITTED',
          metadata: {
            isUrgent: false,
            requestorEmail: 'mso@1pwr.com'
          }
        },
        recipients: ['procurement@1pwrafrica.com'],
        cc: ['mso@1pwr.com'],
        emailBody: {
          subject: 'Test PR Email Notification',
          text: `This is a test email from the PR System. 
                PR Number: TEST-${Date.now()} 
                Status: SUBMITTED`,
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
      
      const result = await sendPRNotificationV2(testData);
      console.log('Email sent successfully!', result);
      
      setResult({
        success: true,
        message: 'Direct function call completed. Check console and Firebase logs.'
      });
    } catch (error) {
      console.error('Direct function call failed:', error);
      setResult({
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    } finally {
      setIsCallingSendEmail(false);
    }
  };

  /**
   * Test logging to Firestore notification collection
   */
  const testFirestoreLogging = async () => {
    setIsLoggingToFirestore(true);
    setResult({});
    
    try {
      console.log('Testing Firestore notification logging');
      
      // Create a test notification log
      const testLog = {
        type: 'TEST_NOTIFICATION',
        prId: 'test-log-' + Date.now(),
        recipients: ['mso@1pwr.com'],
        sentAt: new Date(),
        status: 'pending',
        testTimestamp: serverTimestamp()
      };
      
      // Add to the notifications collection
      const docRef = await addDoc(collection(db, 'purchaseRequestsNotifications'), testLog);
      console.log('Added test notification log with ID:', docRef.id);
      
      setResult({
        success: true,
        message: `Firestore logging test completed. Document ID: ${docRef.id}`
      });
    } catch (error) {
      console.error('Firestore logging test failed:', error);
      setResult({
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    } finally {
      setIsLoggingToFirestore(false);
    }
  };

  return (
    <div className="p-6 border rounded-lg shadow-md">
      <h2 className="text-xl font-bold mb-4">Test Email Notification System</h2>
      <p className="mb-4 text-gray-600">This page lets you test different parts of the notification system.</p>
      
      <div className="space-y-6">
        {/* Test full notification flow */}
        <div className="p-4 border rounded bg-gray-50">
          <h3 className="font-bold mb-2">Test 1: Full Notification Flow</h3>
          <p className="mb-2 text-sm text-gray-600">
            Tests the complete notification process from PR submission to email delivery.
          </p>
          <button
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
            onClick={testFullNotificationFlow}
            disabled={isSending}
          >
            {isSending ? 'Testing...' : 'Run Full Test'}
          </button>
        </div>
        
        {/* Test direct cloud function call */}
        <div className="p-4 border rounded bg-gray-50">
          <h3 className="font-bold mb-2">Test 2: Direct Function Call</h3>
          <p className="mb-2 text-sm text-gray-600">
            Tests sending an email by directly calling the sendPRNotificationV2 cloud function.
          </p>
          <button
            className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
            onClick={testSendEmailFunction}
            disabled={isCallingSendEmail}
          >
            {isCallingSendEmail ? 'Calling Function...' : 'Test Cloud Function'}
          </button>
        </div>
        
        {/* Test Firestore logging */}
        <div className="p-4 border rounded bg-gray-50">
          <h3 className="font-bold mb-2">Test 3: Firestore Logging</h3>
          <p className="mb-2 text-sm text-gray-600">
            Tests logging a notification record to Firestore.
          </p>
          <button
            className="bg-purple-500 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded"
            onClick={testFirestoreLogging}
            disabled={isLoggingToFirestore}
          >
            {isLoggingToFirestore ? 'Logging...' : 'Test Firestore Logging'}
          </button>
        </div>
      </div>
      
      {/* Result display */}
      {result.success && (
        <div className="mt-6 p-4 bg-green-100 text-green-800 rounded">
          <p className="font-bold">Success!</p>
          <p className="mt-1">{result.message}</p>
          <p className="mt-2 text-sm">Check browser console for more details.</p>
        </div>
      )}
      
      {result.error && (
        <div className="mt-6 p-4 bg-red-100 text-red-800 rounded">
          <p className="font-bold">Error:</p>
          <p className="mt-1">{result.error}</p>
          <p className="mt-2 text-sm">Check browser console for more details.</p>
        </div>
      )}
    </div>
  );
}
