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
        prId: pr.id,
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
      const sendPRNotificationV2 = httpsCallable(functions, 'sendPRNotificationV2');
      
      // Extract requestor name from user (who is resubmitting) or PR document
      const requestorName = user?.name || 
        (user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}`.trim() : null) ||
        pr.requestor?.name || 
        (pr.requestor?.firstName && pr.requestor?.lastName ? `${pr.requestor.firstName} ${pr.requestor.lastName}`.trim() : null) ||
        (typeof pr.requestor === 'string' ? pr.requestor : null) ||
        'Unknown Requestor';
      
      await sendPRNotificationV2({
        notification: {
          type: 'PR_RESUBMITTED',
          prId: pr.id,
          prNumber,
          oldStatus: 'REVISION_REQUIRED',
          newStatus: 'RESUBMITTED',
          metadata: {
            isUrgent: pr.isUrgent,
            requestorEmail: pr.requestorEmail || pr.requestor?.email,
            requestorName: requestorName
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

    } catch (error: unknown) {
      console.error('Error creating PR resubmitted notification:', error);
      throw new Error(`Failed to create PR resubmitted notification: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

export const resubmittedNotification = new ResubmittedNotificationHandler();
