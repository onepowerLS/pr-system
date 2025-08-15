import { getFunctions, httpsCallable } from 'firebase/functions';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { generateRevisionRequiredEmail } from '../templates/revisionRequiredTemplate';
import { NotificationLog } from '@/types/notification';
import { getEnvironmentConfig } from '@/config/environment';
import { User } from '@/types/user';
import { NotificationContext } from '../types';
import { PRStatus } from '@/types/pr';

const functions = getFunctions();

/**
 * Converts a User object to a NotificationContext user object
 * @param user User object to convert
 * @returns User object compatible with NotificationContext
 */
function convertToNotificationUser(user?: User): NotificationContext['user'] {
  if (!user) return undefined;
  
  return {
    id: user.id,
    email: user.email || '',
    firstName: user.firstName || '',
    lastName: user.lastName || '',
    name: user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim()
  };
}

export class RevisionRequiredNotificationHandler {
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
   * Creates and sends a revision required notification
   */
  async createNotification(pr: any, prNumber: string, reviewer: User, notes: string): Promise<void> {
    try {
      const baseUrl = getEnvironmentConfig().baseUrl;
      
      // Create a NotificationContext object that matches the interface in '../types'
      const notificationContext: NotificationContext = {
        prId: pr.id,
        pr: pr,
        prNumber,
        baseUrl,
        user: convertToNotificationUser(reviewer),
        notes,
        isUrgent: pr.isUrgent || false,
        oldStatus: PRStatus.SUBMITTED,
        newStatus: PRStatus.REVISION_REQUIRED
      };
      
      // Generate email content
      const emailContent = await generateRevisionRequiredEmail(notificationContext);

      // Prepare recipients - send to requestor and notify procurement
      // Use a Set to avoid duplicates and normalize email addresses to lowercase
      const recipientsSet = new Set<string>();
      
      // Add requestor email if available
      if (pr.requestorEmail) {
        recipientsSet.add(pr.requestorEmail.toLowerCase());
      }
      
      // Add procurement email
      recipientsSet.add(this.PROCUREMENT_EMAIL.toLowerCase());
      
      // Convert Set to array for the notification
      const recipients = Array.from(recipientsSet).filter(Boolean);

      // Log the notification
      const notificationId = await this.logNotification(pr.id, recipients);

      // Send email via cloud function
      const sendPRNotificationV2 = httpsCallable(functions, 'sendPRNotificationV2');
      
      // Extract requestor name from PR document
      const requestorName = pr.requestor?.name || 
        (pr.requestor?.firstName && pr.requestor?.lastName ? `${pr.requestor.firstName} ${pr.requestor.lastName}`.trim() : null) ||
        (typeof pr.requestor === 'string' ? pr.requestor : null) ||
        'Unknown Requestor';
      
      await sendPRNotificationV2({
        notification: {
          type: 'REVISION_REQUIRED',
          prId: pr.id,
          prNumber,
          oldStatus: PRStatus.SUBMITTED,
          newStatus: PRStatus.REVISION_REQUIRED,
          metadata: {
            isUrgent: pr.isUrgent,
            requestorEmail: pr.requestorEmail,
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
      console.error('Error creating revision required notification:', error);
      throw new Error(`Failed to create revision required notification: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

export const revisionRequiredNotification = new RevisionRequiredNotificationHandler();
