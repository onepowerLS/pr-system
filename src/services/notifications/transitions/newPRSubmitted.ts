import { StatusTransitionHandler, NotificationContext, Recipients, EmailContent } from '../types';
import { generateNewPREmail } from '../templates/newPRTemplate';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { logger } from '@/utils/logger';
import { UserReference } from '@/types/pr';

// Define procurement email constant
const PROCUREMENT_EMAIL = 'procurement@1pwrafrica.com';

export class NewPRSubmittedHandler implements StatusTransitionHandler {
  async getRecipients(context: NotificationContext): Promise<Recipients> {
    // Check if a notification has already been sent for this PR
    const hasExistingNotification = await this.checkForExistingNotification(context.prId);
    if (hasExistingNotification) {
      logger.info('Notification already sent for this PR. Skipping duplicate.');
      return { to: [], cc: [] }; // Return empty recipients to prevent sending
    }
    
    // Get the requestor email from the PR
    const requestorEmail = context.pr?.requestorEmail || context.pr?.requestor?.email;
    
    // Create CC list with unique emails only
    const ccList = new Set<string>();
    
    // Add requestor if they're not the submitter
    if (requestorEmail && (!context.user?.email || requestorEmail !== context.user.email)) {
      ccList.add(requestorEmail);
    }
    
    // Add submitter to CC if they're not the requestor
    if (context.user?.email && context.user.email !== requestorEmail) {
      ccList.add(context.user.email);
    }
    
    logger.debug('NewPRSubmittedHandler recipients:', { 
      to: [PROCUREMENT_EMAIL], 
      cc: Array.from(ccList) 
    });
    
    return {
      to: [PROCUREMENT_EMAIL],
      cc: Array.from(ccList)
    };
  }

  async getEmailContent(context: NotificationContext): Promise<EmailContent> {
    // Ensure we have a valid PR object
    if (!context.pr) {
      logger.error('Missing PR object in notification context');
      throw new Error('Missing PR object in notification context');
    }
    
    // Format submitter information
    const submitterName = context.user?.name || 
                         ((context.user?.firstName && context.user?.lastName) ? 
                         `${context.user?.firstName || ''} ${context.user?.lastName || ''}`.trim() : 
                         context.user?.email || 'Unknown');
    
    // Convert approver to the expected format
    let approverForEmail: UserReference | string | undefined;
    
    if (context.approver) {
      if (context.approver.id) {
        // Create a UserReference object with required id field
        approverForEmail = {
          id: context.approver.id,
          email: context.approver.email,
          firstName: context.approver.firstName,
          lastName: context.approver.lastName,
          name: context.approver.name
        } as UserReference;
      } else {
        // If no ID, use email as string identifier
        approverForEmail = context.approver.email;
      }
    }
    
    // Call the template generator with properly typed parameters
    return generateNewPREmail({
      pr: context.pr,
      prNumber: context.prNumber,
      approver: approverForEmail,
      baseUrl: context.baseUrl,
      submitter: {
        firstName: context.user?.firstName,
        lastName: context.user?.lastName,
        email: context.user?.email,
        name: submitterName
      }
    });
  }
  
  /**
   * Check if a notification has already been sent for this PR
   */
  private async checkForExistingNotification(prId?: string): Promise<boolean> {
    if (!prId) return false;
    
    try {
      // Check in notifications collection
      const notificationsRef = collection(db, 'notifications');
      const q = query(
        notificationsRef,
        where('prId', '==', prId),
        where('type', '==', 'STATUS_CHANGE'),
        where('oldStatus', '==', null),
        where('newStatus', '==', 'SUBMITTED')
      );
      
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        return true;
      }
      
      // Also check in purchaseRequestsNotifications collection
      const prNotificationsRef = collection(db, 'purchaseRequestsNotifications');
      const prNotificationsQuery = query(
        prNotificationsRef,
        where('prId', '==', prId),
        where('type', '==', 'PR_SUBMITTED')
      );
      
      const prNotificationsSnapshot = await getDocs(prNotificationsQuery);
      return !prNotificationsSnapshot.empty;
    } catch (error) {
      logger.error('Error checking for existing notifications:', error);
      return false; // In case of error, proceed with sending
    }
  }
}
