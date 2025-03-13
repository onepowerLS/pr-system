import { getFunctions, httpsCallable } from 'firebase/functions';
import { collection, addDoc, serverTimestamp, getDoc, doc, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { generateNewPREmail } from '../templates/newPRTemplate';
import { NotificationLog } from '@/types/notification';
import { getEnvironmentConfig } from '@/config/environment';
import { logger } from '@/utils/logger';
import { prService } from '@/services/pr';

const functions = getFunctions();

export class SubmitPRNotificationHandler {
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
      type: 'PR_SUBMITTED',
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
   */
  async createNotification(pr: any, inputPrNumber?: string): Promise<void> {
    try {
      // Generate a user-friendly PR number if not available
      const prNumber = inputPrNumber || pr.prNumber || `PR-${pr.id.substring(0, 8)}`;

      logger.debug('Creating PR submission notification', { prId: pr.id, prNumber });
      
      // Check if this PR already has a notification sent
      // This prevents duplicate emails
      const notificationsRef = collection(db, 'notifications');
      const q = query(
        notificationsRef,
        where('prId', '==', pr.id),
        where('type', '==', 'STATUS_CHANGE'),
        where('oldStatus', '==', null),
        where('newStatus', '==', 'SUBMITTED')
      );
      
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        logger.info('Notification already sent for this PR submission. Skipping duplicate notification.');
        return;
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
        logger.info('PR submission notification already exists in purchaseRequestsNotifications. Skipping duplicate notification.');
        return;
      }
      
      // Get the PR document to ensure we have all the data
      const prDoc = await this.getPRDocument(pr.id);
      if (!prDoc) {
        throw new Error(`PR document not found: ${pr.id}`);
      }

      if (!prDoc.id) {
        throw new Error('PR ID is required for notification');
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
            await this.prService.updatePR(prDoc.id, {
              approvalWorkflow: {
                ...prDoc.approvalWorkflow,
                currentApprover: prDoc.approver
              }
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
          name: approverInfo.name || `${approverInfo.firstName || ''} ${approverInfo.lastName || ''}`.trim()
        } : null
      });

      // Ensure requestor information is complete
      const requestorInfo = {
        firstName: prDoc.requestor?.firstName || '',
        lastName: prDoc.requestor?.lastName || '',
        email: prDoc.requestor?.email || prDoc.requestorEmail || '',
        name: prDoc.requestor?.name || 
              (prDoc.requestor?.firstName && prDoc.requestor?.lastName) ? 
              `${prDoc.requestor.firstName} ${prDoc.requestor.lastName}`.trim() : 
              ''
      };

      // Generate email content with whatever approver info we have
      const emailContent = generateNewPREmail({
        pr: prDoc,
        prNumber,
        approver: approverInfo,
        baseUrl,
        submitter: requestorInfo
      });

      // Set up recipients
      const toRecipients = [this.PROCUREMENT_EMAIL];
      const ccRecipients = new Set<string>(); // Use a Set to avoid duplicates
      
      // Add approver to CC if available
      if (approverInfo?.email) {
        ccRecipients.add(approverInfo.email);
      }
      
      // Add requestor to CC if different from sender
      if (requestorInfo.email) {
        ccRecipients.add(requestorInfo.email);
      }

      logger.debug('Sending PR submission notification to:', { 
        to: toRecipients, 
        cc: Array.from(ccRecipients) 
      });

      // Send email via cloud function
      const sendPRNotificationV2 = httpsCallable(functions, 'sendPRNotificationV2');
      await sendPRNotificationV2({
        notification: {
          prId: prDoc.id,
          prNumber,
          oldStatus: '',
          newStatus: 'SUBMITTED',
          user: {
            email: requestorInfo.email,
            name: requestorInfo.name || `${requestorInfo.firstName || ''} ${requestorInfo.lastName || ''}`.trim()
          },
          notes: prDoc.notes || '',
          metadata: {
            description: prDoc.description || '',
            amount: prDoc.estimatedAmount,
            currency: prDoc.currency,
            department: prDoc.department || prDoc.requestor?.department,
            requiredDate: prDoc.requiredDate,
            isUrgent: prDoc.isUrgent
          }
        },
        recipients: toRecipients,
        cc: Array.from(ccRecipients),
        emailBody: {
          subject: emailContent.subject,
          text: emailContent.text,
          html: emailContent.html
        },
        metadata: {
          prUrl: `${baseUrl}/pr/${prDoc.id}`,
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

      // Update notification status
      await addDoc(collection(db, this.notificationsCollection), {
        id: notificationId,
        status: 'sent',
        updatedAt: serverTimestamp()
      });

    } catch (error: unknown) {
      logger.error('Failed to create PR submission notification', { 
        error: error instanceof Error ? error.message : String(error),
        prId: pr.id
      });
      throw new Error(`Failed to create PR submission notification: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async getPRDocument(prId: string): Promise<any> {
    try {
      const prRef = doc(db, 'prs', prId);
      const prSnap = await getDoc(prRef);
      if (!prSnap.exists()) {
        return null;
      }
      return { id: prSnap.id, ...prSnap.data() };
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
