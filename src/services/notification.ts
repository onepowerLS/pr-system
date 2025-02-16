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
    console.log('Attempt 1 to send status change notification for PR', prId);

    let attempts = 0;
    const maxAttempts = 3;
    const retryDelay = 1000; // 1 second
    let lastError: Error | null = null;

    while (attempts < maxAttempts) {
      try {
        attempts++;
        const pr = await prService.getPR(prId);
        if (!pr) {
          throw new Error(`PR not found: ${prId}`);
        }

        // Get requestor email
        let requestorEmail = '';
        let requestorName = '';
        if (pr.requestor?.id) {
          const requestorDoc = await getDoc(doc(db, 'users', pr.requestor.id));
          if (requestorDoc.exists()) {
            const requestorData = requestorDoc.data();
            requestorEmail = requestorData.email?.toLowerCase() || '';
            requestorName = `${requestorData.firstName || ''} ${requestorData.lastName || ''}`.trim() || requestorData.email;
          }
        }

        // Get current approver info
        let approverInfo = null;
        if (pr.approvalWorkflow?.currentApprover) {
          const approverDoc = await getDoc(doc(db, 'users', pr.approvalWorkflow.currentApprover));
          if (approverDoc.exists()) {
            const approverData = approverDoc.data();
            approverInfo = {
              id: pr.approvalWorkflow.currentApprover,
              email: approverData.email?.toLowerCase() || '',
              name: `${approverData.firstName || ''} ${approverData.lastName || ''}`.trim() || approverData.email
            };
          }
        }

        const notification = await this.createNotification(
          pr,
          oldStatus,
          newStatus,
          user,
          notes
        );

        // Format email content
        const baseUrl = window.location.origin;
        const prUrl = `${baseUrl}/pr/${prId}`;
        const emailBody = {
          text: `PR Status Change Notification

PR #${pr.prNumber || 'Unknown'} has been updated:

From: ${oldStatus || 'Unknown'}
To: ${newStatus || 'Unknown'}
By: ${notification.user.name} (${notification.user.email})
Notes: ${notes || 'No notes provided'}

PR Details:
Description: ${pr.description || 'No description provided'}
Amount: ${pr.currency || 'Unknown'} ${pr.estimatedAmount || 0}
Department: ${pr.department || 'No department specified'}
Required Date: ${pr.requiredDate || 'No date specified'}
${approverInfo ? `Current Approver: ${approverInfo.name} (${approverInfo.email})\n` : ''}
Requestor: ${requestorName} (${requestorEmail})

Please log in to the system to view more details: ${prUrl}`,
          html: `<h2>PR Status Change Notification</h2>

<p>PR #${pr.prNumber || 'Unknown'} has been updated:</p>

<ul style="list-style-type: none; padding-left: 20px;">
    <li>From: ${oldStatus || 'Unknown'}</li>
    <li>To: ${newStatus || 'Unknown'}</li>
    <li>By: ${notification.user.name} (${notification.user.email})</li>
    <li>Notes: ${notes || 'No notes provided'}</li>
</ul>

<h3>PR Details:</h3>

<ul style="list-style-type: none; padding-left: 20px;">
    <li>Description: ${pr.description || 'No description provided'}</li>
    <li>Amount: ${pr.currency || 'Unknown'} ${pr.estimatedAmount || 0}</li>
    <li>Department: ${pr.department || 'No department specified'}</li>
    <li>Required Date: ${pr.requiredDate || 'No date specified'}</li>
    ${approverInfo ? `<li>Current Approver: ${approverInfo.name} (${approverInfo.email})</li>` : ''}
    <li>Requestor: ${requestorName} (${requestorEmail})</li>
</ul>

<p>Please <a href="${prUrl}">click here</a> to view the PR details in the system.</p>`
        };

        // Build recipient list
        const recipients = new Set<string>();
        const ccList = new Set<string>();

        // Add procurement team
        recipients.add(this.PROCUREMENT_EMAIL);

        // Add requestor to CC
        if (requestorEmail) {
          ccList.add(requestorEmail);
        }

        // Add approver to CC
        if (approverInfo?.email) {
          ccList.add(approverInfo.email);
        }

        // Send email via Cloud Function
        await sendPRNotification({
          notification,
          recipients: Array.from(recipients),
          cc: Array.from(ccList),
          emailBody,
          metadata: {
            prUrl,
            requestorEmail,
            approverInfo
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
