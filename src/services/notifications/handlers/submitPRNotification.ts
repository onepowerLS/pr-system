import { getFunctions, httpsCallable } from 'firebase/functions';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { generateNewPREmail } from '../templates/newPRTemplate';
import { NotificationLog } from '@/types/notification';
import { getEnvironmentConfig } from '@/config/environment';

const functions = getFunctions();

export class SubmitPRNotificationHandler {
  private readonly notificationsCollection = 'purchaseRequestsNotifications';
  private readonly PROCUREMENT_EMAIL = 'procurement@1pwrafrica.com';

  /**
   * Logs a notification in Firestore
   */
  private async logNotification(
    prId: string,
    recipients: string[],
    status: NotificationLog['status'] = 'pending'
  ): Promise<string> {
    const notification: Omit<NotificationLog, 'id'> = {
      type: 'PR_SUBMITTED',
      prId,
      recipients,
      sentAt: new Date(),
      status,
    };

    const docRef = await addDoc(collection(db, this.notificationsCollection), notification);
    return docRef.id;
  }

  /**
   * Creates and sends a PR submission notification
   */
  async createNotification(pr: any, prNumber: string): Promise<void> {
    if (!pr.id) {
      throw new Error('PR ID is required for notification');
    }

    try {
      const baseUrl = getEnvironmentConfig().baseUrl;
      
      // Generate email content
      const emailContent = generateNewPREmail({
        pr,
        prNumber,
        baseUrl,
        user: pr.requestor || {
          firstName: '',
          lastName: '',
          email: pr.requestorEmail || '',
          department: pr.department || ''
        },
        notes: pr.notes,
        isUrgent: pr.isUrgent || false
      });

      // Prepare recipients
      const recipients = [
        this.PROCUREMENT_EMAIL,
        pr.requestorEmail
      ].filter(Boolean);

      // Add current approver to recipients if available
      if (pr.approvalWorkflow?.currentApprover?.email) {
        recipients.push(pr.approvalWorkflow.currentApprover.email);
      }

      // Log the notification
      const notificationId = await this.logNotification(pr.id, recipients);

      // Send email via cloud function
      const sendPRNotification = httpsCallable(functions, 'sendPRNotification');
      await sendPRNotification({
        notification: {
          type: 'PR_SUBMITTED',
          prId: pr.id,
          prNumber,
          oldStatus: null,
          newStatus: 'SUBMITTED',
          user: {
            email: pr.requestorEmail || '',
            name: pr.requestor ? `${pr.requestor.firstName || ''} ${pr.requestor.lastName || ''}`.trim() : ''
          },
          notes: pr.notes || '',
          metadata: {
            isUrgent: pr.isUrgent,
            requestorEmail: pr.requestorEmail,
            approvalWorkflow: pr.approvalWorkflow || null,
            department: pr.department,
            amount: pr.estimatedAmount,
            currency: pr.currency,
            requiredDate: pr.requiredDate
          }
        },
        recipients,
        emailBody: {
          subject: emailContent.subject,
          text: emailContent.text,
          html: emailContent.html
        }
      });

      // Update notification status
      await addDoc(collection(db, this.notificationsCollection), {
        id: notificationId,
        status: 'sent',
        updatedAt: serverTimestamp()
      });

    } catch (error) {
      console.error('Error creating PR submission notification:', error);
      throw new Error(`Failed to create PR submission notification: ${error.message}`);
    }
  }
}

export const submitPRNotification = new SubmitPRNotificationHandler();
