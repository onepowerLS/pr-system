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

import { collection, addDoc, Timestamp, query, where, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import { NotificationLog, NotificationType, StatusChangeNotification } from '../types/notification';
import { User } from '../types/user';

/**
 * Notification Service Class
 * Handles all notification-related operations including logging and delivery
 */
class NotificationService {
  private readonly notificationsCollection = 'notifications';

  /**
   * Logs a new notification to the system
   * @param type - Type of notification
   * @param prId - ID of the related purchase request
   * @param recipients - List of recipient user IDs
   * @param status - Initial notification status
   * @returns Promise resolving to the notification ID
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
   * Handles a status change notification
   * @param prId - ID of the related purchase request
   * @param oldStatus - Previous status of the PR
   * @param newStatus - New status of the PR
   * @param user - User who triggered the status change
   * @param notes - Optional notes about the status change
   */
  async handleStatusChange(
    prId: string,
    oldStatus: string,
    newStatus: string,
    user: User,
    notes?: string
  ): Promise<void> {
    const notification: StatusChangeNotification = {
      prId,
      oldStatus,
      newStatus,
      changedBy: user,
      timestamp: new Date()
    };

    // Only add notes if they exist
    if (notes) {
      notification.notes = notes;
    }

    console.log('Status change notification:', notification);

    try {
      // Log the notification in Firestore
      await this.logNotification(
        'STATUS_CHANGE',
        prId,
        ['procurement@1pwrafrica.com', user.email], // Include both procurement and user email
        'pending'
      );
    } catch (error) {
      console.error('Error logging notification:', error);
      throw error;
    }
  }

  /**
   * Retrieves notifications for a specific purchase request
   * @param prId - ID of the purchase request
   * @returns Promise resolving to an array of notification logs
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
}

export const notificationService = new NotificationService();
