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

import { collection, addDoc, doc, getDoc, serverTimestamp, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { db } from '../config/firebase';
import { prService } from './pr';
import { User } from '../types/user';
import { PRStatus } from '../types/pr';
import { Notification } from '../types/notification';

const functions = getFunctions();

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

  private readonly PROCUREMENT_EMAIL = 'procurement@1pwrafrica.com';

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
    oldStatus: PRStatus,
    newStatus: PRStatus,
    user: User | null,
    notes?: string
  ): Promise<void> {
    const maxAttempts = 3;
    const retryDelay = 1000; // 1 second
    let lastError: Error | null = null;

    // Get PR data
    const prRef = doc(db, 'purchaseRequests', prId);
    const prDoc = await getDoc(prRef);
    
    if (!prDoc.exists()) {
      throw new Error('PR not found');
    }

    const pr = { id: prDoc.id, ...prDoc.data() };
    const notification = await this.createNotification(pr, oldStatus, newStatus, user, notes);

    // Get base URL from window location
    const baseUrl = window.location.origin;
    const prUrl = `${baseUrl}/pr/${prId}`;

    for (let attempts = 1; attempts <= maxAttempts; attempts++) {
      try {
        // Get the appropriate cloud function based on the status transition
        const transitionKey = `${oldStatus || 'NEW'}->${newStatus}`;
        const functionMap: Record<string, Function> = {
          'NEW->SUBMITTED': httpsCallable(functions, 'sendNewPRNotification'),
          'SUBMITTED->REVISION_REQUIRED': httpsCallable(functions, 'sendRevisionRequiredNotification'),
          'REVISION_REQUIRED->SUBMITTED': httpsCallable(functions, 'sendResubmittedNotification'),
          'SUBMITTED->PENDING_APPROVAL': httpsCallable(functions, 'sendPendingApprovalNotification'),
          'PENDING_APPROVAL->APPROVED': httpsCallable(functions, 'sendApprovedNotification'),
          'PENDING_APPROVAL->REJECTED': httpsCallable(functions, 'sendRejectedNotification')
        };

        const cloudFunction = functionMap[transitionKey];
        if (!cloudFunction) {
          throw new Error(`No notification handler found for transition: ${transitionKey}`);
        }

        const result = await cloudFunction({
          prId: pr.id,
          prNumber: pr.prNumber,
          user: user ? {
            email: user.email,
            name: `${user.firstName} ${user.lastName}`
          } : null,
          notes,
          recipients: notification.recipients,
          cc: notification.cc || [],
          emailContent: notification.emailBody,
          metadata: {
            prUrl,
            requestorEmail: pr.requestor?.email,
            ...(pr.approvalWorkflow?.currentApprover ? { approverInfo: pr.approvalWorkflow.currentApprover } : {})
          }
        });

        console.log('Cloud function response:', result);

        // Save notification to Firestore
        const notificationsRef = collection(db, 'notifications');
        await addDoc(notificationsRef, {
          ...notification,
          createdAt: serverTimestamp()
        });

        return;

      } catch (error) {
        lastError = error as Error;
        console.error(`Error sending status change notification (attempt ${attempts}/${maxAttempts}):`, error);
        if (attempts < maxAttempts) {
          console.log(`Retrying in ${retryDelay}ms...`);
          await new Promise(resolve => setTimeout(resolve, retryDelay));
        }
      }
    }

    // If we get here, all attempts failed
    throw lastError || new Error('Failed to send notification after multiple attempts');
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
      // Get approver's email
      const approverRef = doc(db, 'users', approverId);
      const approverDoc = await getDoc(approverRef);
      
      if (!approverDoc.exists()) {
        throw new Error('Approver not found');
      }

      const approverEmail = approverDoc.data().email;

      // Log notification with both approver and procurement
      await this.logNotification(
        'APPROVAL_REQUESTED', 
        prId, 
        [approverEmail, this.PROCUREMENT_EMAIL]
      );

      // Send notification via cloud function
      const sendApproverNotification = httpsCallable(functions, 'sendApproverNotification');
      await sendApproverNotification({
        prId,
        prNumber,
        approverId,
        recipients: [approverEmail],
        cc: [this.PROCUREMENT_EMAIL] // Always CC procurement
      });

      console.log('Approver notification sent successfully');
    } catch (error) {
      console.error('Error sending approver notification:', error);
      throw new Error('Failed to send approver notification');
    }
  }

  async handleSubmission(pr: PR, action: string): Promise<void> {
    try {
      console.log('Starting handleSubmission with:', {
        prId: pr.id,
        prNumber: pr.prNumber,
        action
      });

      // Use handleStatusChange which now uses the modular notification system
      await this.handleStatusChange(
        pr.id,
        null, // oldStatus is null for new PR
        PRStatus.SUBMITTED, // newStatus is SUBMITTED for new PR
        {
          email: pr.requestorEmail || '',
          firstName: pr.requestor?.firstName || '',
          lastName: pr.requestor?.lastName || '',
          id: pr.requestorId || ''
        },
        undefined // no notes for initial submission
      );

    } catch (error) {
      console.error('Error in handleSubmission:', error);
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
      const sendEmailNotification = httpsCallable(functions, 'sendEmailNotification');
      await sendEmailNotification({ 
        notification: {
          type: 'CUSTOM',
          prId,
          message,
          timestamp: serverTimestamp()
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

  async getProcurementTeamEmails(organization: string): Promise<string[]> {
    try {
      console.log('Getting procurement team emails:', {
        rawOrg: organization,
        normalizedOrgId: organization
      });

      // Query users with procurement team permissions (level 2 or 3)
      const q = query(
        collection(db, 'users'),
        where('organization', '==', organization),
        where('permissionLevel', 'in', [2, 3])
      );

      const querySnapshot = await getDocs(q);
      console.log('Procurement team query results:', {
        totalResults: querySnapshot.size,
        docs: querySnapshot.docs
      });

      const emails = querySnapshot.docs
        .map(doc => doc.data().email?.toLowerCase())
        .filter(email => email) as string[];

      console.log('Found procurement team emails:', {
        organization,
        count: emails.length,
        emails
      });

      // Always include backup procurement email
      if (!emails.includes(this.PROCUREMENT_EMAIL)) {
        emails.push(this.PROCUREMENT_EMAIL);
      }

      return emails;
    } catch (error) {
      console.error('Error getting procurement team emails:', error);
      // Return backup email if query fails
      return [this.PROCUREMENT_EMAIL];
    }
  }

  /**
   * Creates a notification object for a PR status change.
   */
  private async createNotification(
    pr: any,
    oldStatus: PRStatus,
    newStatus: PRStatus,
    user: User | null,
    notes?: string
  ): Promise<any> {
    const notification = {
      id: '',
      type: 'STATUS_CHANGE',
      prId: pr.id,
      prNumber: pr.prNumber,
      oldStatus,
      newStatus,
      user: user ? {
        email: user.email,
        name: `${user.firstName} ${user.lastName}`.trim()
      } : null,
      notes: notes || '',
      recipients: [pr.requestor?.email || this.PROCUREMENT_EMAIL].filter(Boolean),
      cc: [this.PROCUREMENT_EMAIL],
      emailBody: {
        subject: `PR ${pr.prNumber} Status Changed: ${oldStatus} → ${newStatus}`,
        text: `PR ${pr.prNumber} status has changed from ${oldStatus} to ${newStatus}\n` +
          (notes ? `Notes: ${notes}\n` : ''),
        html: `
          <p>PR ${pr.prNumber} status has changed from ${oldStatus} to ${newStatus}</p>
          ${notes ? `<p><strong>Notes:</strong> ${notes}</p>` : ''}
        `
      }
    };

    console.log('Notification object:', notification);
    return notification;
  }

  private async getNotificationRecipients(pr: PR): Promise<string[]> {
    // Always include procurement team
    const recipients = [this.PROCUREMENT_EMAIL];

    // Add requestor to recipients
    if (pr.requestor?.email) {
      recipients.push(pr.requestor.email);
    }

    return recipients;
  }
}

/**
 * Singleton instance of the Notification Service
 */
export const notificationService = new NotificationService();
