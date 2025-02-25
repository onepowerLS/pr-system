import { getFunctions, httpsCallable } from 'firebase/functions';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { generateRejectedEmail } from '../templates/rejectedTemplate';
import { NotificationLog } from '@/types/notification';
import { getEnvironmentConfig } from '@/config/environment';
import { User } from '@/types/user';

const functions = getFunctions();

export class RejectedNotificationHandler {
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
   * Creates and sends a PR rejected notification
   */
  async createNotification(pr: any, prNumber: string, reviewer: User, notes: string): Promise<void> {
    try {
      const baseUrl = getEnvironmentConfig().baseUrl;
      
      // Generate email content
      const emailContent = generateRejectedEmail({
        pr,
        prNumber,
        baseUrl,
        user: reviewer,
        notes,
        isUrgent: pr.isUrgent
      });

      // Prepare recipients - notify requestor and procurement
      const recipients = [
        pr.requestorEmail,
        this.PROCUREMENT_EMAIL
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
          oldStatus: 'PENDING_APPROVAL',
          newStatus: 'REJECTED'
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
      console.error('Error creating PR rejected notification:', error);
      throw new Error(`Failed to create PR rejected notification: ${error.message}`);
    }
  }
}

export const rejectedNotification = new RejectedNotificationHandler();
