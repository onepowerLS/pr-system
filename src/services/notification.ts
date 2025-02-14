/**
 * @fileoverview Notification Service
 * @version 1.1.0
 * 
 * Description:
 * Manages the notification system for the PR System, handling email notifications
 * and in-app notifications for PR status changes, approvals, and comments.
 * 
 * Architecture Notes:
 * - Uses Firebase Cloud Functions for email delivery
 * - Maintains notification logs in Firestore
 * - Implements retry logic for failed notifications
 * - Supports batch notification processing
 * 
 * Notification Types:
 * - PR_CREATED: New PR created
 * - PR_UPDATED: PR details modified
 * - STATUS_CHANGE: PR status changed
 * - APPROVAL_REQUESTED: New approval needed
 * - COMMENT_ADDED: New comment on PR
 * 
 * Related Modules:
 * - src/types/notification.ts: Notification type definitions
 * - src/services/pr.ts: PR service that triggers notifications
 * - Cloud Functions: Email delivery implementation
 * 
 * Error Handling:
 * - Failed notifications are logged and retried
 * - Notification status is tracked (pending/sent/failed)
 * - Dead letter queue for undeliverable notifications
 */

import { collection, addDoc, Timestamp, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { db } from '../config/firebase';
import { NotificationLog, NotificationType, StatusChangeNotification } from '../types/notification';
import { User } from '../types/user';

/**
 * Notification Service class
 * 
 * Handles logging and sending notifications for PR status changes, approvals, and comments.
 */
export class NotificationService {
  /**
   * Collection name for notification logs in Firestore
   */
  private readonly notificationsCollection = 'purchaseRequestsNotifications';

  /**
   * Logs a notification in Firestore and returns the notification ID.
   * 
   * @param type Notification type (e.g. STATUS_CHANGE, APPROVAL_REQUESTED)
   * @param prId PR ID associated with the notification
   * @param recipients List of recipient email addresses
   * @param status Initial notification status (default: 'pending')
   * @returns Notification ID
   */
  async logNotification(
    type: NotificationType,
    prId: string,
    recipients: string[],
    status: NotificationLog['status'] = 'pending'
  ): Promise<string> {
    const notification: Omit<NotificationLog, 'id'> = {
      type,
      prId,
      recipients,
      sentAt: new Date(),
      status,
    };

    const docRef = await addDoc(collection(db, this.notificationsCollection), notification);
    return docRef.id;
  }

  /**
   * Handles a PR status change notification.
   * 
   * @param prId PR ID associated with the notification
   * @param oldStatus Previous PR status
   * @param newStatus New PR status
   * @param user User who triggered the status change
   * @param notes Optional notes about the status change
   */
  async handleStatusChange(
    prId: string,
    oldStatus: string,
    newStatus: string,
    user: User,
    notes?: string
  ): Promise<void> {
    try {
      // Get PR data
      const prRef = doc(db, 'purchaseRequests', prId);
      const prDoc = await getDoc(prRef);
      
      if (!prDoc.exists()) {
        throw new Error('PR not found');
      }

      const pr = prDoc.data();
      const functions = getFunctions();
      const sendStatusChangeNotification = httpsCallable(functions, 'sendStatusChangeNotification');

      // Get user's name, falling back to email username if firstName/lastName not available
      const updaterName = user.firstName && user.lastName 
        ? `${user.firstName} ${user.lastName}`
        : user.email.split('@')[0];

      // Get approver details if present
      let approverName: string | undefined;
      let approverEmail: string | undefined;
      
      if (pr.approver || pr.approvers?.[0] || pr.approvalWorkflow?.currentApprover) {
        const approverId = pr.approver || pr.approvers?.[0] || pr.approvalWorkflow?.currentApprover;
        if (approverId) {
          const approverRef = doc(db, 'users', approverId);
          const approverDoc = await getDoc(approverRef);
          if (approverDoc.exists()) {
            const approverData = approverDoc.data();
            approverName = approverData.firstName && approverData.lastName 
              ? `${approverData.firstName} ${approverData.lastName}`
              : approverData.email.split('@')[0];
            approverEmail = approverData.email;
          }
        }
      }

      // Prepare notification data
      const notificationData = {
        notification: {
          prId,
          prNumber: pr.prNumber,
          oldStatus,
          newStatus,
          changedBy: {
            name: updaterName,
            email: user.email
          },
          notes: notes || '',
          description: pr.description,
          department: pr.department,
          requiredDate: pr.requiredDate,
          baseUrl: window.location.origin,
          approverName,
          approverEmail
        },
        recipients: [pr.requestorEmail, 'procurement@1pwrafrica.com']
      };

      // Add approver to recipients if status is PENDING_APPROVAL
      if (approverEmail && newStatus === 'PENDING_APPROVAL') {
        notificationData.recipients.push(approverEmail);
      }

      // Send notification using callable function
      await sendStatusChangeNotification(notificationData);

      // Log the notification
      await this.logNotification(
        'STATUS_CHANGE',
        prId,
        notificationData.recipients,
        'sent'
      );
    } catch (error) {
      console.error('Error sending status change notification:', error);
      throw new Error('Failed to send status change notification');
    }
  }

  /**
   * Sends a notification to an approver.
   */
  async sendApproverNotification(
    prId: string,
    prNumber: string,
    approverId: string
  ): Promise<void> {
    try {
      // Log notification
      await this.logNotification('APPROVAL_REQUESTED', prId, [approverId]);

      // Send notification via cloud function
      const response = await fetch(
        'https://us-central1-pr-system-4ea55.cloudfunctions.net/sendApproverNotification',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            prId,
            prNumber,
            approverId
          })
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Failed to send approver notification: ${error.error || 'Unknown error'}`);
      }

      console.log('Approver notification sent successfully');
    } catch (error) {
      console.error('Error sending approver notification:', error);
      throw new Error('Failed to send approver notification');
    }
  }

  /**
   * Handles a PR submission notification.
   * 
   * @param prId PR ID associated with the notification
   * @param description PR description
   * @param user User who submitted the PR
   */
  async handleSubmission(prId: string, description: string, user: User): Promise<void> {
    try {
      // Get PR data to get PR number and requestor email
      const prRef = doc(db, 'purchaseRequests', prId);
      const prDoc = await getDoc(prRef);
      
      if (!prDoc.exists()) {
        throw new Error('PR not found');
      }

      const pr = prDoc.data();
      const functions = getFunctions();
      const sendPRNotification = httpsCallable(functions, 'sendPRNotification');

      // Get user's name, falling back to email username if firstName/lastName not available
      const requestorName = user.firstName && user.lastName 
        ? `${user.firstName} ${user.lastName}`
        : user.email.split('@')[0];

      // Prepare notification data
      const notificationData = {
        prId,
        prNumber: pr.prNumber,
        description,
        requestorName,
        requestorEmail: user.email,
        department: pr.department,
        requiredDate: pr.requiredDate,
        isUrgent: pr.isUrgent,
        items: pr.lineItems
      };

      // Send notification using callable function
      await sendPRNotification(notificationData);

      // Log the notification
      await this.logNotification(
        'PR_CREATED',
        prId,
        ['procurement@1pwrafrica.com', user.email],
        'sent'
      );
    } catch (error) {
      console.error('Error sending submission notification:', error);
      throw error;
    }
  }

  /**
   * Sends a direct notification to a specific user.
   * 
   * @param prId PR ID associated with the notification
   * @param userId ID of the user to notify
   * @param message Custom message for the notification
   */
  async sendNotification(
    prId: string,
    userId: string,
    message: string
  ): Promise<void> {
    try {
      // Get user data to get email
      const userRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userRef);
      
      if (!userDoc.exists()) {
        throw new Error('User not found');
      }

      const userData = userDoc.data();
      
      // Log notification
      await this.logNotification(
        'CUSTOM',
        prId,
        [userData.email],
        'pending'
      );

      // Send email via Cloud Function
      const functions = getFunctions();
      const sendEmailNotification = httpsCallable(functions, 'sendEmailNotification');
      await sendEmailNotification({ 
        notification: {
          type: 'CUSTOM',
          prId,
          message,
          timestamp: Timestamp.now()
        }
      });

    } catch (error) {
      console.error('Error sending notification:', error);
      throw error;
    }
  }

  /**
   * Retrieves a list of notifications associated with a PR.
   * 
   * @param prId PR ID to retrieve notifications for
   * @returns List of notification logs
   */
  async getNotificationsByPR(prId: string): Promise<NotificationLog[]> {
    const q = query(
      collection(db, this.notificationsCollection),
      where('prId', '==', prId)
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as NotificationLog[];
  }
}

/**
 * Singleton instance of the Notification Service
 */
export const notificationService = new NotificationService();
