import { getFunctions, httpsCallable } from 'firebase/functions';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { generatePendingApprovalEmail } from '../templates/pendingApprovalTemplate';
import { NotificationLog } from '@/types/notification';
import { getEnvironmentConfig } from '@/config/environment';
import { User } from '@/types/user';
import { NotificationUser } from '../templates/types';

const functions = getFunctions();

/**
 * Converts a User object to a NotificationUser object
 * @param user User object to convert
 * @returns NotificationUser object or null if user is undefined
 */
function convertToNotificationUser(user?: User): NotificationUser | null {
  if (!user) return null;
  
  return {
    firstName: user.firstName || '',
    lastName: user.lastName || '',
    email: user.email || '',
    name: user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Unknown User'
  };
}

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
        user: convertToNotificationUser(user),
        notes: pr.notes,
        isUrgent: pr.isUrgent
      });

      // Prepare recipients - send to approver and notify requestor
      // Use a Set to avoid duplicates and normalize email addresses to lowercase
      const recipientsSet = new Set<string>();
      
      // Add approver email if available
      if (approver.email) {
        recipientsSet.add(approver.email.toLowerCase());
      }
      
      // Add requestor email if available
      if (pr.requestorEmail) {
        recipientsSet.add(pr.requestorEmail.toLowerCase());
      }
      
      // Convert Set to array for the notification
      const recipients = Array.from(recipientsSet).filter(Boolean);

      // Log the notification
      const notificationId = await this.logNotification(pr.id, recipients);

      // Send email via cloud function
      const sendPRNotificationV2 = httpsCallable(functions, 'sendPRNotificationV2');
      
      // Extract requestor name from user if available
      const requestorName = user?.name || 
        (user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}`.trim() : null) ||
        (pr.requestor?.name) || 
        (pr.requestor?.firstName && pr.requestor?.lastName ? `${pr.requestor.firstName} ${pr.requestor.lastName}`.trim() : null) ||
        'Unknown Requestor';
      
      await sendPRNotificationV2({
        notification: {
          type: 'PENDING_APPROVAL',
          prId: pr.id,
          prNumber,
          oldStatus: 'IN_QUEUE',
          newStatus: 'PENDING_APPROVAL',
          metadata: {
            isUrgent: pr.isUrgent,
            requestorEmail: pr.requestorEmail,
            requestorName: requestorName,
            approverEmail: approver.email
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
      console.error('Error creating pending approval notification:', error);
      throw new Error(`Failed to create pending approval notification: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

export const pendingApprovalNotification = new PendingApprovalNotificationHandler();
