import { collection, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { db } from '../../config/firebase';
import { User } from '../../types/user';
import { PRStatus } from '../../types/pr';
import { NotificationContext, StatusTransitionHandler } from './types';
import { InQueueToPendingApprovalHandler } from './transitions/inQueueToPendingApproval';
import { SubmittedToRevisionRequiredHandler } from './transitions/submittedToRevisionRequired';
import { RevisionRequiredToResubmittedHandler } from './transitions/revisionRequiredToResubmitted';

export class NotificationService {
  private readonly notificationsCollection = 'purchaseRequestsNotifications';
  private transitionHandlers: Map<string, StatusTransitionHandler>;

  constructor() {
    this.transitionHandlers = new Map();
    this.registerTransitionHandlers();
  }

  private registerTransitionHandlers() {
    // Register handlers for each status transition
    this.transitionHandlers.set(
      this.getTransitionKey('IN_QUEUE', 'PENDING_APPROVAL'),
      new InQueueToPendingApprovalHandler()
    );
    
    // Register SUBMITTED to REVISION_REQUIRED handler
    this.transitionHandlers.set(
      this.getTransitionKey('SUBMITTED', 'REVISION_REQUIRED'),
      new SubmittedToRevisionRequiredHandler()
    );

    // Register REVISION_REQUIRED to RESUBMITTED handler
    this.transitionHandlers.set(
      this.getTransitionKey('REVISION_REQUIRED', 'RESUBMITTED'),
      new RevisionRequiredToResubmittedHandler()
    );
  }

  private getTransitionKey(oldStatus: PRStatus, newStatus: PRStatus): string {
    return `${oldStatus}_to_${newStatus}`;
  }

  private getDefaultHandler(): StatusTransitionHandler {
    return {
      getRecipients: async (context: NotificationContext) => ({
        to: ['procurement@1pwrafrica.com'],
        cc: context.user?.email ? [context.user.email] : []
      }),
      getEmailContent: async (context: NotificationContext) => ({
        subject: `PR ${context.prNumber} Status Changed: ${context.oldStatus} → ${context.newStatus}`,
        body: `
          <p>PR ${context.prNumber} status has changed from ${context.oldStatus} to ${context.newStatus}</p>
          ${context.notes ? `<p><strong>Notes:</strong> ${context.notes}</p>` : ''}
          <p><a href="${window.location.origin}/pr/${context.prId}">View PR Details</a></p>
        `
      })
    };
  }

  private async retryOperation<T>(operation: () => Promise<T>, maxRetries = 3, initialDelay = 1000): Promise<T> {
    let lastError: any;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        console.warn(`Attempt ${attempt + 1} failed:`, error);
        if (attempt < maxRetries - 1) {
          const delay = initialDelay * Math.pow(2, attempt);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    throw lastError;
  }

  async createNotification(pr: any, oldStatus: string, newStatus: string, user: any, notes: string) {
    try {
      const prId = pr.id;
      const prRef = doc(db, 'purchaseRequests', prId);
      const prDoc = await this.retryOperation(() => getDoc(prRef));

      if (!prDoc.exists()) {
        throw new Error('PR not found');
      }

      const prData = prDoc.data();
      const notification = {
        id: '',
        type: 'STATUS_CHANGE',
        prId,
        prNumber: prData.prNumber,
        oldStatus,
        newStatus,
        user: user ? {
          email: user.email,
          name: `${user.firstName} ${user.lastName}`.trim()
        } : undefined,
        notes: notes || '',
        metadata: {
          description: prData.description,
          amount: prData.amount,
          currency: prData.currency,
          department: prData.department,
          requiredDate: prData.requiredDate,
          isUrgent: prData.isUrgent || false
        }
      };

      // Get the appropriate handler or use default
      const transitionKey = this.getTransitionKey(oldStatus, newStatus);
      const handler = this.transitionHandlers.get(transitionKey) || this.getDefaultHandler();

      const context: NotificationContext = {
        prId,
        prNumber: prData.prNumber,
        oldStatus,
        newStatus,
        user: user ? {
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName
        } : undefined,
        notes,
        metadata: notification.metadata
      };

      // Get recipients and email content with retry
      const recipients = await this.retryOperation(() => handler.getRecipients(context));
      const emailContent = await this.retryOperation(() => handler.getEmailContent(context));

      // Send notification using Firebase Function with retry
      const sendPRNotification = httpsCallable(getFunctions(), 'sendPRNotification');
      await this.retryOperation(() => sendPRNotification({
        notification,
        recipients: recipients.to,
        cc: recipients.cc,
        emailBody: emailContent
      }), 5, 2000); // More retries and longer delay for sending email

      // Log notification with retry
      await this.retryOperation(() => addDoc(collection(db, this.notificationsCollection), {
        ...notification,
        status: 'sent',
        recipients: recipients.to,
        cc: recipients.cc,
        emailContent,
        timestamp: serverTimestamp()
      }));

      console.log('Notification sent successfully:', {
        prId,
        prNumber: prData.prNumber,
        recipients: recipients.to,
        cc: recipients.cc,
        oldStatus,
        newStatus
      });

      return notification;
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }

  async handleStatusChange(
    prId: string,
    prNumber: string,
    oldStatus: PRStatus,
    newStatus: PRStatus,
    user: User | null,
    notes?: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    const transitionKey = this.getTransitionKey(oldStatus, newStatus);
    const handler = this.transitionHandlers.get(transitionKey) || this.getDefaultHandler();

    const context: NotificationContext = {
      prId,
      prNumber,
      oldStatus,
      newStatus,
      user,
      notes,
      metadata
    };

    try {
      // Run pre-transition hooks if any
      if (handler.beforeTransition) {
        await this.retryOperation(() => handler.beforeTransition!(context));
      }

      // Get recipients and email content
      const [recipients, emailContent] = await Promise.all([
        this.retryOperation(() => handler.getRecipients(context)),
        this.retryOperation(() => handler.getEmailContent(context))
      ]);

      // Send notification via Cloud Function
      const functions = getFunctions();
      const sendNotification = httpsCallable(functions, 'sendStatusChangeNotification');
      
      await this.retryOperation(() => 
        sendNotification({
          notification: {
            prId,
            prNumber,
            oldStatus,
            newStatus,
            user: user ? {
              email: user.email,
              name: `${user.firstName} ${user.lastName}`.trim()
            } : null,
            notes,
            metadata
          },
          recipients: recipients.to,
          cc: recipients.cc,
          emailBody: {
            subject: emailContent.subject,
            text: emailContent.text,
            html: emailContent.html
          }
        })
      );

      // Log notification
      await this.retryOperation(() =>
        addDoc(collection(db, this.notificationsCollection), {
          type: 'STATUS_CHANGE',
          prId,
          prNumber,
          oldStatus,
          newStatus,
          user: user ? {
            id: user.id,
            email: user.email,
            name: `${user.firstName} ${user.lastName}`.trim()
          } : null,
          notes,
          recipients: recipients.to,
          cc: recipients.cc,
          metadata,
          createdAt: serverTimestamp()
        })
      );

      // Run post-transition hooks if any
      if (handler.afterTransition) {
        await this.retryOperation(() => handler.afterTransition!(context));
      }
    } catch (error) {
      console.error(`Error handling ${transitionKey} notification:`, error);
      throw error;
    }
  }
}

export const notificationService = new NotificationService();
