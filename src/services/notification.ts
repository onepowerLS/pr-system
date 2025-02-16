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
const sendPRNotification = httpsCallable(functions, 'sendPRNotification');

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

    // Get requestor email from PR data
    const requestorEmail = pr.requestor?.email;
    
    // Get approver info if it exists
    const approverInfo = pr.approver ? {
      id: pr.approver.id,
      email: pr.approver.email,
      name: pr.approver.name
    } : undefined;

    // Initialize recipients and CC lists
    const recipients = new Set<string>();
    const ccList = new Set<string>();

    // Always include procurement team
    recipients.add(this.PROCUREMENT_EMAIL);

    // Add requestor to recipients for cancellation
    if (newStatus === 'CANCELED' && requestorEmail) {
      recipients.add(requestorEmail);
    } else if (requestorEmail) {
      // For other status changes, add requestor to CC
      ccList.add(requestorEmail);
    }

    // Add approver to CC if exists
    if (approverInfo?.email) {
      ccList.add(approverInfo.email);
    }

    // Get base URL from window location
    const baseUrl = window.location.origin;
    const prUrl = `${baseUrl}/pr/${prId}`;

    // Generate email body
    const emailBody = {
      text: `PR ${pr.prNumber} status has changed from ${oldStatus} to ${newStatus}`,
      html: `
        <p>PR ${pr.prNumber} status has changed from ${oldStatus} to ${newStatus}</p>
        <p><strong>Notes:</strong> ${notes || 'No notes provided'}</p>
        <p><a href="${prUrl}">View PR Details</a></p>
      `
    };

    for (let attempts = 1; attempts <= maxAttempts; attempts++) {
      try {
        const sendPRNotification = httpsCallable(functions, 'sendPRNotification');
        await sendPRNotification({
          notification,
          recipients: Array.from(recipients),
          cc: Array.from(ccList),
          emailBody,
          metadata: {
            prUrl,
            requestorEmail,
            ...(approverInfo ? { approverInfo } : {})
          }
        });

        // Save notification to Firestore
        const notificationsRef = collection(db, 'notifications');
        await addDoc(notificationsRef, {
          ...notification,
          recipients: Array.from(recipients),
          cc: Array.from(ccList),
          emailBody,
          metadata: {
            prUrl,
            requestorEmail,
            ...(approverInfo ? { approverInfo } : {})
          },
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

    console.log('All attempts to send notification failed');
    throw new Error(`Failed to send notification after ${maxAttempts} attempts: ${lastError?.message || 'Unknown error'}`);
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

  /**
   * Handles a PR submission notification.
   * 
   * @param prId PR ID associated with the notification
   * @param description PR description
   * @param user User who submitted the PR
   */
  async handleSubmission(prId: string, description: string, user: User): Promise<void> {
    try {
      // Get PR data
      const prRef = doc(db, 'purchaseRequests', prId);
      const prDoc = await getDoc(prRef);
      
      if (!prDoc.exists()) {
        throw new Error('PR not found');
      }

      const pr = prDoc.data();
      const sendPRNotification = httpsCallable(functions, 'sendPRNotification');

      // Get user's name, falling back to email username if firstName/lastName not available
      const requestorName = user.firstName && user.lastName 
        ? `${user.firstName} ${user.lastName}`
        : user.email.split('@')[0];

      // Calculate total amount
      const totalAmount = pr.lineItems ? pr.lineItems.reduce((sum: number, item: any) => sum + (item.total || 0), 0) : 0;

      // Prepare notification data
      const notificationData = {
        prData: {
          id: prId,
          prNumber: pr.prNumber,
          description,
          department: pr.department || 'Not specified',
          requiredDate: pr.requiredDate || 'Not specified',
          currency: pr.currency,
          estimatedAmount: pr.estimatedAmount || 0,
          requestor: requestorName,
          urgencyLevel: pr.isUrgent ? 'HIGH' : 'NORMAL',
          items: pr.lineItems ? pr.lineItems.map(item => ({
            description: item.description || '',
            quantity: item.quantity || 0,
            uom: item.uom || '',
            notes: item.notes || 'N/A',
            attachments: item.attachments || []
          })) : []
        },
        recipients: [this.PROCUREMENT_EMAIL, user.email]
      };

      console.log('Sending PR submission notification:', notificationData);

      try {
        // Send notification using callable function
        const result = await sendPRNotification(notificationData);
        console.log('PR notification sent successfully:', result);

        // Log the notification
        await this.logNotification(
          'PR_CREATED',
          prId,
          [this.PROCUREMENT_EMAIL],
          'sent'
        );
      } catch (error: any) {
        console.error('Error sending PR notification:', error);
        const errorMessage = error.message || 'Failed to send notification';
        
        // Log failed notification
        await this.logNotification(
          'PR_CREATED',
          prId,
          [this.PROCUREMENT_EMAIL],
          'failed'
        );
        
        throw new Error(errorMessage);
      }
    } catch (error) {
      console.error('Error sending submission notification:', error);
      // Log failed notification
      await this.logNotification(
        'PR_CREATED',
        prId,
        [this.PROCUREMENT_EMAIL],
        'failed'
      );
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

  private async createNotification(
    pr: any,
    oldStatus: PRStatus,
    newStatus: PRStatus,
    user: User | null,
    notes?: string
  ): Promise<Notification> {
    // Log input data
    console.log('Creating notification with:', {
      pr: {
        id: pr.id,
        prNumber: pr.prNumber,
        status: pr.status
      },
      oldStatus,
      newStatus,
      user: user?.email,
      notes
    });

    const notification: Notification = {
      id: '', // Will be set by Firestore
      type: 'STATUS_CHANGE',
      prId: pr.id,
      prNumber: pr.prNumber || '',
      oldStatus,
      newStatus,
      timestamp: new Date().toISOString(),
      user: {
        email: user?.email || 'system@1pwrafrica.com',
        name: user?.firstName && user?.lastName 
          ? `${user.firstName} ${user.lastName}`
          : user?.email 
            ? user.email.split('@')[0]
            : 'System'
      },
      notes: notes || '',
      metadata: {
        organization: pr.organization || '',
        department: pr.department || '',
        amount: pr.estimatedAmount || 0,
        currency: pr.currency || '',
      }
    };

    // Log notification before saving
    console.log('Notification object:', notification);

    return notification;
  }
}

/**
 * Singleton instance of the Notification Service
 */
export const notificationService = new NotificationService();
