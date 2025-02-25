import { getFunctions, httpsCallable } from 'firebase/functions';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { generateResubmittedEmail } from '../templates/prResubmittedTemplate';
import { NotificationLog } from '@/types/notification';
import { getEnvironmentConfig } from '@/config/environment';
import { User } from '@/types/user';

const functions = getFunctions();

export class ResubmittedNotificationHandler {
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
   * Creates and sends a PR resubmitted notification
   */
  async createNotification(pr: any, prNumber: string, user: User): Promise<void> {
    try {
      const baseUrl = getEnvironmentConfig().baseUrl;
      
      // Generate email content
      const emailContent = generateResubmittedEmail({
        pr,
        prNumber,
        baseUrl,
        user,
        notes: pr.notes,
        isUrgent: pr.isUrgent
      });

      // Prepare recipients - notify procurement team
      const recipients = [
        this.PROCUREMENT_EMAIL,
        // Include previous reviewer if available
        pr.approvalWorkflow?.approvalHistory?.[0]?.approver?.email
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
          oldStatus: 'REVISION_REQUIRED',
          newStatus: 'RESUBMITTED'
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
      console.error('Error creating PR resubmitted notification:', error);
      throw new Error(`Failed to create PR resubmitted notification: ${error.message}`);
    }
  }
}

export const resubmittedNotification = new ResubmittedNotificationHandler();
