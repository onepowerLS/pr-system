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

    // Get base URL from window location
    const baseUrl = window.location.origin;
    const prUrl = `${baseUrl}/pr/${prId}`;

    for (let attempts = 1; attempts <= maxAttempts; attempts++) {
      try {
        const sendPRNotification = httpsCallable(functions, 'sendPRNotification');
        await sendPRNotification({
          notification,
          recipients: notification.recipients,
          cc: notification.cc || [],
          emailBody: notification.emailBody,
          metadata: {
            prUrl,
            requestorEmail: pr.requestor?.email,
            ...(pr.approvalWorkflow?.currentApprover ? { approverInfo: pr.approvalWorkflow.currentApprover } : {})
          }
        });

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

    if (lastError) {
      throw lastError;
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

      const recipients = await this.getNotificationRecipients(pr);
      console.log('Retrieved recipients:', recipients);

      // Validate core fields
      if (!pr.id || typeof pr.id !== 'string') {
        throw new Error(`Invalid prId: ${pr.id}`);
      }
      if (!pr.prNumber || typeof pr.prNumber !== 'string') {
        throw new Error(`Invalid prNumber: ${pr.prNumber}`);
      }
      if (!Array.isArray(recipients) || recipients.length === 0) {
        throw new Error(`Invalid recipients: ${JSON.stringify(recipients)}`);
      }

      // Ensure all recipients are valid email addresses
      const validatedRecipients = recipients.map(recipient => {
        if (typeof recipient !== 'string' || !recipient.includes('@')) {
          throw new Error(`Invalid recipient: ${recipient}`);
        }
        return recipient.toLowerCase();
      });

      // Get priority display info
      const priorityStyle = pr.isUrgent 
        ? 'background-color: #ff4444; color: white;' 
        : 'background-color: #00C851; color: #000';
      const priorityText = pr.isUrgent ? 'URGENT' : 'NORMAL PRIORITY';

      // Format line items HTML
      const lineItemsHtml = pr.lineItems?.map((item, index) => `
        <div style="margin-bottom: 20px;">
          <h3 style="margin: 0 0 10px 0;">Item ${index + 1}</h3>
          <table style="border-collapse: collapse; width: 100%;">
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd; width: 150px;"><strong>Description</strong></td>
              <td style="padding: 8px; border: 1px solid #ddd;">${item.description}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd;"><strong>Quantity</strong></td>
              <td style="padding: 8px; border: 1px solid #ddd;">${item.quantity}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd;"><strong>UOM</strong></td>
              <td style="padding: 8px; border: 1px solid #ddd;">${item.uom}</td>
            </tr>
            ${item.notes ? `
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd;"><strong>Notes</strong></td>
              <td style="padding: 8px; border: 1px solid #ddd;">${item.notes}</td>
            </tr>
            ` : ''}
          </table>
        </div>
      `).join('\n') || '';

      // Construct notification data matching cloud function's expected structure
      const notificationData = {
        notification: {
          prId: pr.id,
          prNumber: pr.prNumber,
          oldStatus: '',  // New PR, no old status
          newStatus: 'SUBMITTED',
          user: {
            email: pr.requestorEmail || '',
            name: pr.requestor || ''
          },
          notes: '',  // No notes for initial submission
          metadata: {
            description: pr.description || '',
            amount: pr.estimatedAmount || pr.amount || 0,  // Use estimatedAmount or amount
            currency: pr.currency || 'LSL',
            department: pr.department || '',
            requiredDate: pr.requiredDate || ''
          }
        },
        recipients: validatedRecipients,
        cc: [pr.requestorEmail], // Include requestor in CC
        emailBody: {
          text: `${pr.isUrgent ? 'URGENT: ' : ''}New Purchase Request: PR #${pr.prNumber}`,
          html: `
        <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto;">
            <h2 style="color: #333;">Purchase Request Details</h2>
           
            <div style="display: inline-block; 
                        padding: 8px 16px; 
                        border-radius: 4px; 
                        font-weight: bold;
                        margin-bottom: 20px;
                        ${priorityStyle}">
                ${priorityText}
            </div>
           
            <table style="border-collapse: collapse; width: 100%; margin-bottom: 30px;">
                <tr>
                    <td style="padding: 8px; border: 1px solid #ddd; width: 150px;"><strong>PR Number</strong></td>
                    <td style="padding: 8px; border: 1px solid #ddd;">${pr.prNumber}</td>
                </tr>
                <tr>
                    <td style="padding: 8px; border: 1px solid #ddd;"><strong>Description</strong></td>
                    <td style="padding: 8px; border: 1px solid #ddd;">${pr.description || 'N/A'}</td>
                </tr>
                <tr>
                    <td style="padding: 8px; border: 1px solid #ddd;"><strong>Department</strong></td>
                    <td style="padding: 8px; border: 1px solid #ddd;">${pr.department || 'N/A'}</td>
                </tr>
                <tr>
                    <td style="padding: 8px; border: 1px solid #ddd;"><strong>Required Date</strong></td>
                    <td style="padding: 8px; border: 1px solid #ddd;">${pr.requiredDate || 'N/A'}</td>
                </tr>
                <tr>
                    <td style="padding: 8px; border: 1px solid #ddd;"><strong>Estimated Amount</strong></td>
                    <td style="padding: 8px; border: 1px solid #ddd;">${pr.currency || 'LSL'} ${pr.estimatedAmount || pr.amount || 0}</td>
                </tr>
                <tr>
                    <td style="padding: 8px; border: 1px solid #ddd;"><strong>Requestor</strong></td>
                    <td style="padding: 8px; border: 1px solid #ddd;">${pr.requestor || 'N/A'}</td>
                </tr>
            </table>

            <div style="margin-bottom: 20px;">
                <a href="https://pr.1pwrafrica.com/pr/${pr.id}" 
                   target="_blank"
                   style="display: inline-block;
                          padding: 10px 20px;
                          background-color: #4CAF50;
                          color: white;
                          text-decoration: none;
                          border-radius: 4px;
                          margin-bottom: 20px;">
                    View Purchase Request
                </a>
            </div>

            <h3 style="color: #333;">Items</h3>
            ${lineItemsHtml}
        </div>
          `
        },
        metadata: {
          prUrl: `https://pr.1pwrafrica.com/pr/${pr.id}`,
          requestorEmail: pr.requestorEmail || ''
        }
      };

      console.log('Sending notification with data:', notificationData);

      const result = await sendPRNotification(notificationData);
      console.log('Cloud function response:', result);
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
