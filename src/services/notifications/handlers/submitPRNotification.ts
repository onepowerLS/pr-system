import { getFunctions, httpsCallable } from 'firebase/functions';
import { collection, addDoc, serverTimestamp, query, where, getDocs, getDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { generateNewPREmail } from '../templates/newPRSubmitted';
import { NotificationType, NotificationLog } from '@/types/notification';
import { getEnvironmentConfig } from '@/config/environment';
import { logger } from '@/utils/logger';

const functions = getFunctions();

export class SubmitPRNotificationHandler {
  private readonly PROCUREMENT_EMAIL = 'procurement@1pwrafrica.com';
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
      type: 'PR_SUBMITTED' as NotificationType,
      prId,
      recipients,
      sentAt: new Date(),
      status,
    };

    const docRef = await addDoc(collection(db, this.notificationsCollection), notification);
    return docRef.id;
  }

  /**
   * Fetches the approver details if only an ID is available
   */
  private async getApproverDetails(approverId: string): Promise<any | null> {
    try {
      if (!approverId) {
        logger.warn('Empty approver ID provided to getApproverDetails');
        return null;
      }
      
      logger.debug('Fetching approver details for ID:', approverId);
      
      // Handle the case where approverId is an object
      if (typeof approverId === 'object') {
        logger.debug('Approver ID is already an object:', approverId);
        return approverId;
      }
      
      const userDocRef = doc(db, 'users', approverId);
      const userDoc = await getDoc(userDocRef);
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        logger.debug('Found approver data:', { userData });
        
        return {
          id: approverId,
          email: userData.email,
          firstName: userData.firstName || '',
          lastName: userData.lastName || '',
          name: userData.firstName && userData.lastName ? 
            `${userData.firstName} ${userData.lastName}` : 
            userData.displayName || userData.email
        };
      }
      
      logger.warn('Approver not found in users collection:', approverId);
      return null;
    } catch (error) {
      logger.error('Error fetching approver details:', error);
      return null;
    }
  }

  /**
   * Creates and sends a PR submission notification
   * @returns Object containing success status and notification ID
   */
  async createNotification(pr: any, inputPrNumber?: string): Promise<{ success: boolean; notificationId?: string; message?: string }> {
    try {
      // Generate a user-friendly PR number if not available
      // Ensure consistent PR number format - prefer the official format from PR document
      let prNumber = '';
      if (pr.prNumber && pr.prNumber.startsWith('PR-')) {
        // Use the official PR number if it's in the correct format
        prNumber = pr.prNumber;
      } else if (inputPrNumber && inputPrNumber.startsWith('PR-')) {
        // Use the input PR number if it's in the correct format
        prNumber = inputPrNumber;
      } else {
        // Generate a fallback PR number if no proper format is available
        prNumber = `PR-${pr.id.substring(0, 8)}`;
        logger.warn('Using fallback PR number format', { 
          prId: pr.id, 
          fallbackPrNumber: prNumber,
          originalPrNumber: pr.prNumber,
          inputPrNumber
        });
      }

      logger.debug('Creating PR submission notification', { prId: pr.id, prNumber });
      
      // Check if this PR already has a notification sent in the notifications collection
      const notificationsRef = collection(db, 'notifications');
      const q = query(
        notificationsRef,
        where('prId', '==', pr.id),
        where('type', '==', 'PR_SUBMITTED')
      );
      
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        logger.info('PR submission notification already exists in notifications collection, skipping', { 
          prId: pr.id, 
          prNumber,
          existingNotifications: querySnapshot.size
        });
        return { 
          success: true, 
          message: 'Notification already sent',
          notificationId: querySnapshot.docs[0].id
        };
      }

      // Also check in the purchaseRequestsNotifications collection
      const prNotificationsRef = collection(db, this.notificationsCollection);
      const prNotificationsQuery = query(
        prNotificationsRef,
        where('prId', '==', pr.id),
        where('type', '==', 'PR_SUBMITTED')
      );
      
      const prNotificationsSnapshot = await getDocs(prNotificationsQuery);
      if (!prNotificationsSnapshot.empty) {
        logger.info('PR submission notification already exists in purchaseRequestsNotifications, skipping', { 
          prId: pr.id, 
          prNumber,
          existingNotifications: prNotificationsSnapshot.size
        });
        return { 
          success: true, 
          message: 'Notification already sent',
          notificationId: prNotificationsSnapshot.docs[0].id
        };
      }
      
      // Also check in the notificationLogs collection
      const notificationLogsRef = collection(db, 'notificationLogs');
      const notificationLogsQuery = query(
        notificationLogsRef,
        where('notification.prId', '==', pr.id),
        where('type', '==', 'PR_SUBMITTED'),
        where('status', '==', 'sent'),
        // Only check logs from the last hour to avoid issues with very old notifications
        where('timestamp', '>=', new Date(Date.now() - 60 * 60 * 1000))
      );
      
      const notificationLogsSnapshot = await getDocs(notificationLogsQuery);
      if (!notificationLogsSnapshot.empty) {
        logger.info('PR submission notification already exists in notificationLogs, skipping', { 
          prId: pr.id, 
          prNumber,
          existingNotifications: notificationLogsSnapshot.size
        });
        return { 
          success: true, 
          message: 'Notification already sent via logs',
          notificationId: notificationLogsSnapshot.docs[0].id
        };
      }
      
      // Get the PR document to ensure we have all the data
      let prDoc = await this.getPRDocument(pr.id);
      
      // If PR document is not found in Firestore yet (due to eventual consistency),
      // use the in-memory PR data passed to this function
      if (!prDoc) {
        logger.warn(`Using in-memory PR data for ID: ${pr.id} since Firestore document is not available yet.`);
        prDoc = { ...pr };
        
        if (!prDoc.id) {
          logger.error('PR ID is missing from in-memory data');
          throw new Error('PR ID is required for notification');
        }
      }

      const config = getEnvironmentConfig();
      const baseUrl = config.baseUrl;
      if (!baseUrl) {
        throw new Error('Base URL is not configured');
      }

      // Generate notification ID and log
      const notificationId = await this.logNotification(prDoc.id, [this.PROCUREMENT_EMAIL]);

      // Detailed raw data logging to detect approver issues
      logger.debug('Raw PR approver data:', {
        approver: prDoc.approver,
        approverType: typeof prDoc.approver,
        approverList: prDoc.approvers,
        workflowExists: !!prDoc.approvalWorkflow,
        workflowApprover: prDoc.approvalWorkflow?.currentApprover,
        workflowApproverType: typeof prDoc.approvalWorkflow?.currentApprover,
      });

      // Find approver information - pr.approver is the single source of truth
      let approverId = null;
      let approverInfo = null;

      // Check the PR.approver field (single source of truth)
      if (prDoc.approver) {
        if (typeof prDoc.approver === 'string') {
          approverId = prDoc.approver;
          logger.debug('Using approver ID from PR.approver (single source of truth):', approverId);
        } else if (typeof prDoc.approver === 'object') {
          approverInfo = prDoc.approver;
          logger.debug('Using approver object from PR.approver (single source of truth):', approverInfo);
        }
      }
      
      // If no approver is set, check if there's an approver in the workflow
      if (!approverId && !approverInfo && prDoc.approvalWorkflow?.currentApprover) {
        if (typeof prDoc.approvalWorkflow.currentApprover === 'string') {
          approverId = prDoc.approvalWorkflow.currentApprover;
          logger.debug('Using approver ID from approvalWorkflow.currentApprover as fallback:', approverId);
        } else if (typeof prDoc.approvalWorkflow.currentApprover === 'object') {
          approverInfo = prDoc.approvalWorkflow.currentApprover;
          logger.debug('Using approver object from approvalWorkflow.currentApprover as fallback:', approverInfo);
        }
      }
      
      // Check for discrepancy between approver and approvalWorkflow.currentApprover
      if (prDoc.approvalWorkflow?.currentApprover && prDoc.approver !== prDoc.approvalWorkflow.currentApprover) {
        logger.warn('Discrepancy detected between PR.approver and approvalWorkflow.currentApprover', {
          prId: prDoc.id,
          prApprover: prDoc.approver,
          workflowApprover: prDoc.approvalWorkflow.currentApprover
        });
        
        // Fix the discrepancy by updating approvalWorkflow.currentApprover to match pr.approver
        if (prDoc.approver) {
          logger.info('Updating approvalWorkflow.currentApprover to match PR.approver (single source of truth)', {
            prId: prDoc.id,
            approver: prDoc.approver
          });
          
          // Update the document in memory
          if (prDoc.approvalWorkflow) {
            prDoc.approvalWorkflow.currentApprover = prDoc.approver;
          }
          
          // Update the document in the database
          try {
            const prRef = doc(db, 'prs', prDoc.id);
            await updateDoc(prRef, {
              'approvalWorkflow.currentApprover': prDoc.approver
            });
            
            logger.info('Updated approvalWorkflow.currentApprover directly via Firestore', {
              prId: prDoc.id,
              approver: prDoc.approver
            });
          } catch (error) {
            logger.error('Failed to update approvalWorkflow.currentApprover', {
              prId: prDoc.id,
              error
            });
          }
        }
      }

      // If we only have an ID, fetch the full details
      if (approverId && !approverInfo) {
        logger.debug('Fetching detailed approver info for:', approverId);
        approverInfo = await this.getApproverDetails(approverId);
        
        // If we get back null but have a valid ID, create a minimal info object
        if (!approverInfo && approverId) {
          logger.warn(`Could not find full approver details for ID: ${approverId}, creating minimal info`);
          approverInfo = {
            id: approverId,
            email: `approver-${approverId}@unknown.com`, // placeholder email
            name: `Approver (ID: ${approverId})` // placeholder name
          };
        }
      }

      // Log what we found
      logger.info('Approver resolution result:', { 
        hasApprover: !!approverInfo, 
        approverId, 
        approverInfo: approverInfo ? {
          id: approverInfo.id,
          email: approverInfo.email,
          name: approverInfo.name || 
                (approverInfo.firstName && approverInfo.lastName ? 
                 `${approverInfo.firstName} ${approverInfo.lastName}`.trim() : 
                 '')
        } : null
      });

      // Enhanced requestor information resolution - ensure we have a complete requestor object
      let requestorInfo = {
        firstName: prDoc.requestor?.firstName || '',
        lastName: prDoc.requestor?.lastName || '',
        email: prDoc.requestor?.email || prDoc.requestorEmail || '',
        // Prioritize full name from requestor object with fallbacks
        name: this.getRequestorName(prDoc)
      };

      // If the requestor name is a placeholder with an ID, try to fetch the full details
      if (requestorInfo.name.startsWith('Requestor (ID:') && prDoc.requestorId) {
        try {
          const userDoc = await getDoc(doc(db, 'users', prDoc.requestorId));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            
            // Update requestor info with user data
            requestorInfo = {
              ...requestorInfo,
              firstName: userData.firstName || requestorInfo.firstName,
              lastName: userData.lastName || requestorInfo.lastName,
              email: userData.email || requestorInfo.email,
              name: userData.firstName && userData.lastName 
                ? `${userData.firstName} ${userData.lastName}`.trim()
                : userData.name || requestorInfo.name
            };
            
            logger.debug('Updated requestor info with user data from Firestore', requestorInfo);
          }
        } catch (error) {
          logger.error('Error fetching requestor details from users collection', {
            error: error instanceof Error ? error.message : String(error),
            requestorId: prDoc.requestorId
          });
        }
      }

      // Log requestor info for debugging
      logger.debug('Final requestor information:', requestorInfo);

      // Create notification context
      const notificationContext = {
        prId: prDoc.id,
        pr: prDoc,
        prNumber,
        approver: approverInfo,
        baseUrl,
        user: requestorInfo,
        isUrgent: prDoc.isUrgent
      };

      // Set up recipients
      const toRecipients = [this.PROCUREMENT_EMAIL];
      // Use a Set to avoid duplicates and normalize email addresses to lowercase
      const ccRecipients = new Set<string>(); 
      
      // Add approver to CC if available
      if (approverInfo?.email) {
        ccRecipients.add(approverInfo.email.toLowerCase());
      }
      
      // Add requestor to CC if different from sender and not already in the list
      if (requestorInfo.email && 
          requestorInfo.email.toLowerCase() !== this.PROCUREMENT_EMAIL.toLowerCase()) {
        // Normalize the email to lowercase to prevent duplicates
        ccRecipients.add(requestorInfo.email.toLowerCase());
      }

      logger.debug('Preparing PR submission notification:', { 
        to: toRecipients, 
        cc: Array.from(ccRecipients) 
      });

      // Instead of sending the email directly, just log the notification to Firestore
      // The Firestore trigger will handle sending the actual email
      try {
        // Generate email content with whatever approver info we have
        const emailContent = await generateNewPREmail(notificationContext);

        // Create a notification document in Firestore
        const notificationRef = await addDoc(collection(db, 'notifications'), {
          type: 'PR_SUBMITTED' as NotificationType,
          prId: prDoc.id,
          prNumber,
          status: 'pending',
          createdAt: new Date().toISOString(),
          recipients: toRecipients.map(email => email.toLowerCase()),
          cc: Array.from(ccRecipients),
          emailContent: {
            subject: emailContent.subject,
            text: emailContent.text,
            html: emailContent.html
          },
          metadata: {
            prUrl: `${baseUrl}/pr/${prDoc.id}`,
            requestorName: requestorInfo.name,
            requestorEmail: requestorInfo.email,
            approverInfo: approverInfo ? {
              id: approverInfo.id || '',
              email: approverInfo.email || '',
              name: approverInfo.name || 
                    (approverInfo.firstName && approverInfo.lastName ? 
                    `${approverInfo.firstName} ${approverInfo.lastName}`.trim() : 
                    '')
            } : null
          }
        });
        
        logger.info('PR submission notification logged to Firestore', { 
          notificationId: notificationRef.id,
          prId: prDoc.id,
          prNumber
        });
        
        return {
          success: true,
          notificationId: notificationRef.id
        };
      } catch (error) {
        logger.error('Failed to log PR submission notification', {
          error: error instanceof Error ? error.message : String(error),
          prId: prDoc.id,
          prNumber
        });
        
        throw error;
      }
    } catch (error: unknown) {
      logger.error('Failed to create PR submission notification', { 
        error: error instanceof Error ? error.message : String(error),
        prId: pr.id,
        prNumber: pr.prNumber
      });
      
      return {
        success: false,
        message: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Helper method to consistently extract requestor name from PR document
   * This ensures we always have a valid name for the requestor
   */
  private getRequestorName(prDoc: any): string {
    // Check for name in requestor object
    if (prDoc.requestor?.name) {
      return prDoc.requestor.name;
    }
    
    // Try to construct from first and last name
    if (prDoc.requestor?.firstName || prDoc.requestor?.lastName) {
      return `${prDoc.requestor.firstName || ''} ${prDoc.requestor.lastName || ''}`.trim();
    }
    
    // Check for submitter name in history
    if (prDoc.history && prDoc.history.length > 0) {
      const submissionEntry = prDoc.history.find((item: any) => 
        item.action === 'CREATED' || item.action === 'SUBMITTED'
      );
      
      if (submissionEntry?.user?.name) {
        return submissionEntry.user.name;
      }
      
      if (submissionEntry?.user?.firstName || submissionEntry?.user?.lastName) {
        return `${submissionEntry.user.firstName || ''} ${submissionEntry.user.lastName || ''}`.trim();
      }
    }
    
    // Check for requestorId and try to get user details from Firestore
    if (prDoc.requestorId) {
      try {
        // This is async, but we're in a sync method, so we'll need to handle this differently
        // We'll return a placeholder and let the caller handle the async lookup if needed
        return `Requestor (ID: ${prDoc.requestorId})`;
      } catch (error) {
        logger.error('Error fetching requestor details by ID', { 
          error: error instanceof Error ? error.message : String(error),
          requestorId: prDoc.requestorId
        });
      }
    }
    
    // Fall back to email if available
    if (prDoc.requestor?.email) {
      return prDoc.requestor.email.split('@')[0]; // Use part before @ as name
    }
    
    if (prDoc.requestorEmail) {
      return prDoc.requestorEmail.split('@')[0]; // Use part before @ as name
    }
    
    // Last resort
    return 'Unknown Requestor';
  }

  private async getPRDocument(prId: string): Promise<any> {
    try {
      // Try to get the document from Firestore
      const prRef = doc(db, 'prs', prId);
      const prSnap = await getDoc(prRef);
      
      if (prSnap.exists()) {
        return { id: prSnap.id, ...prSnap.data() };
      }
      
      // If not found, log a warning but don't fail - we'll use the in-memory data
      logger.warn(`PR document not found in Firestore: ${prId}. This may be due to Firestore's eventual consistency.`);
      return null;
    } catch (error) {
      logger.error('Error fetching PR document', { 
        error: error instanceof Error ? error.message : String(error),
        prId 
      });
      return null;
    }
  }
}

export const submitPRNotification = new SubmitPRNotificationHandler();
