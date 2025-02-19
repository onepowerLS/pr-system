import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { db } from '../../config/firebase';
import { User } from '../../types/user';
import { PRStatus } from '../../types/pr';
import { NotificationContext, StatusTransitionHandler } from './types';
import { InQueueToPendingApprovalHandler } from './transitions/inQueueToPendingApproval';
import { SubmittedToRevisionRequiredHandler } from './transitions/submittedToRevisionRequired';

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
  }

  private getTransitionKey(oldStatus: PRStatus, newStatus: PRStatus): string {
    return `${oldStatus}_to_${newStatus}`;
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
    const handler = this.transitionHandlers.get(transitionKey);

    if (!handler) {
      console.warn(`No notification handler found for transition ${transitionKey}`);
      return;
    }

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
        await handler.beforeTransition(context);
      }

      // Get recipients and email content
      const [recipients, emailContent] = await Promise.all([
        handler.getRecipients(context),
        handler.getEmailContent(context)
      ]);

      // Send notification via Cloud Function
      const functions = getFunctions();
      const sendNotification = httpsCallable(functions, 'sendStatusChangeNotification');
      await sendNotification({
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
          text: emailContent.text,
          html: emailContent.html
        }
      });

      // Log notification
      await addDoc(collection(db, this.notificationsCollection), {
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
      });

      // Run post-transition hooks if any
      if (handler.afterTransition) {
        await handler.afterTransition(context);
      }
    } catch (error) {
      console.error(`Error handling ${transitionKey} notification:`, error);
      throw error;
    }
  }
}

export const notificationService = new NotificationService();
