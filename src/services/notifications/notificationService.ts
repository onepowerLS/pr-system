import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { db } from '../../config/firebase';
import { User } from '../../types/user';
import { PRStatus } from '../../types/pr';
import { NotificationContext } from './types';
import { getTransitionHandler } from './transitions';

const functions = getFunctions();

/**
 * Notification Service class
 * 
 * Handles sending notifications for PR status changes using status-specific handlers.
 */
export class NotificationService {
  private readonly notificationsCollection = 'notifications';
  private readonly maxRetries = 3;
  private readonly retryDelay = 1000; // 1 second

  /**
   * Get the appropriate cloud function for a status transition
   */
  private getCloudFunction(oldStatus: PRStatus | null, newStatus: PRStatus): Function {
    const transitionKey = `${oldStatus || 'NEW'}->${newStatus}`;
    const functionMap: Record<string, Function> = {
      'NEW->SUBMITTED': httpsCallable(functions, 'sendNewPRNotification'),
      'SUBMITTED->REVISION_REQUIRED': httpsCallable(functions, 'sendRevisionRequiredNotification'),
      'REVISION_REQUIRED->SUBMITTED': httpsCallable(functions, 'sendResubmittedNotification'),
      'SUBMITTED->PENDING_APPROVAL': httpsCallable(functions, 'sendPendingApprovalNotification'),
      'PENDING_APPROVAL->APPROVED': httpsCallable(functions, 'sendApprovedNotification'),
      'PENDING_APPROVAL->REJECTED': httpsCallable(functions, 'sendRejectedNotification')
    };

    const cloudFunction = functionMap[transitionKey];
    if (!cloudFunction) {
      throw new Error(`No notification handler found for transition: ${transitionKey}. Each status transition must have its own dedicated handler.`);
    }

    return cloudFunction;
  }

  /**
   * Handles a PR status change notification.
   * 
   * @param prId PR ID associated with the notification
   * @param oldStatus Previous PR status (null for new PR)
   * @param newStatus New PR status
   * @param user User who triggered the status change
   * @param notes Optional notes about the status change
   */
  async handleStatusChange(
    prId: string,
    oldStatus: PRStatus | null,
    newStatus: PRStatus,
    user: User | null,
    notes?: string
  ): Promise<void> {
    let lastError: Error | null = null;

    // Create notification context
    const context: NotificationContext = {
      prId,
      prNumber: '', // Will be filled by the handler
      oldStatus: oldStatus || PRStatus.SUBMITTED,
      newStatus,
      user: user ? {
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName
      } : undefined,
      notes
    };

    // Get the appropriate handler for this transition
    const handler = getTransitionHandler(oldStatus, newStatus);
    if (!handler) {
      throw new Error(`No handler found for transition ${oldStatus} -> ${newStatus}`);
    }

    // Execute any pre-transition logic
    if (handler.beforeTransition) {
      await handler.beforeTransition(context);
    }

    // Get recipients and email content
    const recipients = await handler.getRecipients(context);
    const emailContent = await handler.getEmailContent(context);

    // Get the appropriate cloud function
    const cloudFunction = this.getCloudFunction(oldStatus, newStatus);

    // Try to send the notification with retries
    for (let attempts = 1; attempts <= this.maxRetries; attempts++) {
      try {
        const result = await cloudFunction({
          prId: context.prId,
          prNumber: context.prNumber,
          user: context.user ? {
            email: context.user.email,
            name: `${context.user.firstName} ${context.user.lastName}`.trim()
          } : null,
          notes: context.notes,
          metadata: context.metadata,
          recipients: recipients.to,
          cc: recipients.cc,
          emailContent
        });

        console.log('Notification sent successfully:', result);

        // Save notification to Firestore
        await addDoc(collection(db, this.notificationsCollection), {
          type: 'STATUS_CHANGE',
          prId: context.prId,
          prNumber: context.prNumber,
          oldStatus: context.oldStatus,
          newStatus: context.newStatus,
          user: context.user,
          notes: context.notes,
          recipients: recipients.to,
          cc: recipients.cc,
          emailContent,
          timestamp: serverTimestamp()
        });

        // Execute any post-transition logic
        if (handler.afterTransition) {
          await handler.afterTransition(context);
        }

        return;

      } catch (error) {
        lastError = error as Error;
        console.error(`Error sending status change notification (attempt ${attempts}/${this.maxRetries}):`, error);
        
        if (attempts < this.maxRetries) {
          console.log(`Retrying in ${this.retryDelay}ms...`);
          await new Promise(resolve => setTimeout(resolve, this.retryDelay));
        }
      }
    }

    // If we get here, all attempts failed
    throw lastError || new Error('Failed to send notification after multiple attempts');
  }
}

export const notificationService = new NotificationService();
