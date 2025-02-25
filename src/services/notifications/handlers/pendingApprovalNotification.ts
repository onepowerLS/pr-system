import { getFunctions, httpsCallable } from 'firebase/functions';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { generatePendingApprovalEmail } from '../templates/pendingApprovalTemplate';
import { NotificationLog } from '@/types/notification';
import { getEnvironmentConfig } from '@/config/environment';
import { User } from '@/types/user';

const functions = getFunctions();

export class PendingApprovalNotificationHandler {
  private readonly notificationsCollection = 'purchaseRequestsNotifications';

  /**
   * Logs a notification in Firestore
   */
  private async logNotification(
    prId: string,
    recipients: string[],
    status: NotificationLog['status'] = 'pending'
  ): Promise<string> {
    const notification: Omit<NotificationLog, 'id'> = {
      type: 'STATUS_CHANGE',
      prId,
      recipients,
      sentAt: new Date(),
      status,
    };

    const docRef = await addDoc(collection(db, this.notificationsCollection), notification);
    return docRef.id;
  }

  /**
   * Creates and sends a pending approval notification
   */
  async createNotification(pr: any, prNumber: string, approver: User, user?: User): Promise<void> {
    try {
      const baseUrl = getEnvironmentConfig().baseUrl;
      
      // Generate email content
      const emailContent = generatePendingApprovalEmail({
        pr,
        prNumber,
        baseUrl,
        user,
        notes: pr.notes,
        isUrgent: pr.isUrgent
      });

      // Prepare recipients - send to approver and notify requestor
      const recipients = [
        approver.email,
        pr.requestorEmail
      ].filter(Boolean);

      // Log the notification
      const notificationId = await this.logNotification(pr.id, recipients);

      // Send email via cloud function
      const sendPRNotification = httpsCallable(functions, 'sendPRNotification');
      await sendPRNotification({
        notification: {
          type: 'STATUS_CHANGE',
          prId: pr.id,
          prNumber,
          oldStatus: 'IN_QUEUE',
          newStatus: 'PENDING_APPROVAL'
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
      console.error('Error creating pending approval notification:', error);
      throw new Error(`Failed to create pending approval notification: ${error.message}`);
    }
  }
}

export const pendingApprovalNotification = new PendingApprovalNotificationHandler();
