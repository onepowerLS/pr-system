import { collection, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { db } from '../../config/firebase';
import { User } from '../../types/user';
import { PRStatus, PRRequest } from '../../types/pr';
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
    
    // Default to the generic notification function for transitions that don't have a specific handler
    let cloudFunction: Function;
    
    // Map specific transitions to their dedicated cloud functions
    switch (transitionKey) {
      case 'NEW->SUBMITTED':
        cloudFunction = httpsCallable(functions, 'sendPRNotificationV2');
        break;
      case 'SUBMITTED->REVISION_REQUIRED':
        cloudFunction = httpsCallable(functions, 'sendRevisionRequiredNotification');
        break;
      case 'REVISION_REQUIRED->SUBMITTED':
        cloudFunction = httpsCallable(functions, 'sendPRNotificationV2'); // Fallback to generic
        break;
      case 'SUBMITTED->PENDING_APPROVAL':
        cloudFunction = httpsCallable(functions, 'sendPRNotificationV2'); // Fallback to generic
        break;
      case 'IN_QUEUE->PENDING_APPROVAL':
        cloudFunction = httpsCallable(functions, 'sendPRNotificationV2'); // Fallback to generic
        break;
      case 'PENDING_APPROVAL->APPROVED':
        cloudFunction = httpsCallable(functions, 'sendPRNotificationV2'); // Fallback to generic
        break;
      case 'PENDING_APPROVAL->REJECTED':
        cloudFunction = httpsCallable(functions, 'sendPRNotificationV2'); // Fallback to generic
        break;
      default:
        cloudFunction = httpsCallable(functions, 'sendPRNotificationV2'); // Generic fallback
    }

    console.log(`Using cloud function for transition ${transitionKey}:`, cloudFunction.name || 'Anonymous Function');
    
    return cloudFunction;
  }

  /**
   * Gets a PR document from Firestore
   * 
   * @param prId PR ID
   * @returns PR document data
   */
  private async getPRDocument(prId: string): Promise<any> {
    try {
      const docRef = doc(db, 'prs', prId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        return {
          ...data,
          id: prId
        };
      }
      
      return null;
    } catch (error) {
      console.error(`Error getting PR document ${prId}:`, error);
      return null;
    }
  }

  /**
   * Handles a PR status change notification.
   * 
   * @param prId PR ID associated with the notification
   * @param oldStatus Previous PR status (null for new PR)
   * @param newStatus New PR status
   * @param user User who triggered the status change
   * @param metadata Additional metadata for the notification
   */
  async handleStatusChange(
    prId: string,
    oldStatus: PRStatus | null,
    newStatus: PRStatus,
    user: User | null,
    metadata?: Record<string, any>
  ): Promise<void> {
    let lastError: Error | null = null;

    try {
      // Get the PR data from Firestore
      const prDoc = await this.getPRDocument(prId);
      if (!prDoc) {
        throw new Error(`PR with ID ${prId} not found`);
      }

      // Create notification context
      const context: NotificationContext = {
        prId,
        pr: prDoc as PRRequest,
        prNumber: prDoc.prNumber || `ID-${prId.substring(0, 8)}`,
        oldStatus: oldStatus || PRStatus.SUBMITTED,
        newStatus,
        isUrgent: prDoc.isUrgent,
        user: user ? {
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName
        } : undefined,
        notes: metadata?.notes,
        metadata
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
          await this.logNotification(
            'STATUS_CHANGE',
            context.prId,
            [...(recipients.to || []), ...(recipients.cc || [])],
            'SENT',
            {
              prNumber: context.prNumber,
              oldStatus: context.oldStatus,
              newStatus: context.newStatus,
              user: context.user,
              notes: context.notes,
              emailContent,
              timestamp: serverTimestamp()
            }
          );

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
    } catch (error) {
      console.error('Error handling status change:', error);
      throw error;
    }
  }

  /**
   * Logs a notification to Firestore
   * 
   * @param type Notification type
   * @param prId PR ID associated with the notification
   * @param recipients List of recipient email addresses
   * @param status Notification status
   * @param metadata Additional metadata for the notification
   * @returns ID of the created notification document
   */
  async logNotification(
    type: string,
    prId: string,
    recipients: string[],
    status: string,
    metadata?: Record<string, any>
  ): Promise<string> {
    try {
      // Filter out any undefined values from metadata
      const cleanMetadata = metadata ? Object.fromEntries(
        Object.entries(metadata).filter(([_, v]) => v !== undefined)
      ) : {};

      // Create notification document
      const notificationData = {
        type,
        prId,
        recipients,
        status,
        timestamp: new Date().toISOString(),
        ...cleanMetadata // Spread cleaned metadata to include all fields, including prNumber
      };

      console.log('Notification logged:', notificationData);

      // Add to Firestore
      const docRef = await addDoc(collection(db, this.notificationsCollection), notificationData);
      return docRef.id;
    } catch (error) {
      console.error('Error logging notification:', error);
      throw error;
    }
  }
}

export const notificationService = new NotificationService();
