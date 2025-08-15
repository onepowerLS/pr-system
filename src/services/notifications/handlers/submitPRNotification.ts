import { getFunctions, httpsCallable } from 'firebase/functions';
import { collection, addDoc, serverTimestamp, query, where, getDocs, getDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { generateNewPREmail } from '../templates/newPRSubmitted';
import { NotificationType, NotificationLog } from '@/types/notification';
import { NotificationContext } from '@/services/notifications/types';
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

      // Log the complete PR document structure for debugging
      logger.debug('PR document structure for requestor information:', {
        requestorId: prDoc.requestorId,
        requestorEmail: prDoc.requestorEmail,
        requestorObject: prDoc.requestor,
        requestorName: prDoc.requestor?.name,
        requestorFirstName: prDoc.requestor?.firstName,
        requestorLastName: prDoc.requestor?.lastName
      });

      // Enhanced requestor information resolution - ensure we have a complete requestor object
      let requestorInfo = {
        firstName: prDoc.requestor?.firstName || '',
        lastName: prDoc.requestor?.lastName || '',
        email: prDoc.requestor?.email || prDoc.requestorEmail || '',
        // Prioritize full name from requestor object with fallbacks
        name: ''  // Will fill this below
      };

      // Standard name resolution
      requestorInfo.name = await this.getRequestorName(prDoc);

      // If the requestor name is a placeholder with an ID, try to fetch the full details
      if ((requestorInfo.name.startsWith('Requestor (ID:') || !requestorInfo.name) && prDoc.requestorId) {
        try {
          const userDoc = await getDoc(doc(db, 'users', prDoc.requestorId));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            
            requestorInfo = {
              ...requestorInfo,
              firstName: userData.firstName || requestorInfo.firstName,
              lastName: userData.lastName || requestorInfo.lastName,
              email: userData.email || requestorInfo.email,
              name: userData.firstName && userData.lastName 
                ? `${userData.firstName} ${userData.lastName}` : 
                userData.name || requestorInfo.name
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

      // Additional checks for requestor name from PR document structure
      if ((!requestorInfo.name || requestorInfo.name === 'Unknown Requestor') && 
          requestorInfo.email?.toLowerCase() !== 'jopi@1pwrafrica.com') {
        // First check for name in the primary requestor field
        if (prDoc.requestor?.name) {
          requestorInfo.name = prDoc.requestor.name;
          logger.debug('Using requestor name from prDoc.requestor.name', requestorInfo.name);
        }
        // Then try combining firstName and lastName if available
        else if (prDoc.requestor?.firstName || prDoc.requestor?.lastName) {
          requestorInfo.name = `${prDoc.requestor.firstName || ''} ${prDoc.requestor.lastName || ''}`.trim();
          logger.debug('Using combined firstName/lastName', requestorInfo.name);
        }
      }

      // Force default name if nothing found
      if (!requestorInfo.name || requestorInfo.name === 'Unknown Requestor') {
        if (requestorInfo.email) {
          // Extract name from email with our improved nameFromEmail function
          requestorInfo.name = this.nameFromEmail(requestorInfo.email);
          logger.debug('Using nameFromEmail for fallback name', requestorInfo.name);
        } else {
          // Last resort default that's more informative than 'Unknown'
          requestorInfo.name = 'PR Requestor';
          logger.debug('Using default fallback name: PR Requestor');
        }
      }

      // Log final requestor info for debugging
      logger.debug('Final requestor information:', requestorInfo);

      // Create notification context
      const notificationContext: NotificationContext = {
        pr: prDoc,
        prId: prDoc.id,
        prNumber,
        approver: approverInfo,
        baseUrl,
        requestorInfo: {
          name: requestorInfo.name || 'Unknown Requestor',
          email: requestorInfo.email || 'Unknown Email'
        },
        metadata: {
          isUrgent: prDoc.isUrgent || false,
        }
      };

      // Get the requestor name - this will use our generalizable approach
      const requestorName = await this.getRequestorName(prDoc);
      
      logger.info(`Creating PR submission notification`, { prId: prDoc.id, prNumber, requestorName });
      
      // Generate email content
      const { html, text, subject } = await generateNewPREmail(notificationContext);
      
      // Get recipients
      const recipients = [this.PROCUREMENT_EMAIL];
      
      // Add CC list
      const cc = [];
      
      // Always CC the requestor
      if (prDoc.requestorEmail) {
        cc.push(prDoc.requestorEmail);
      }
      
      // If requestor has a different email in their user record, CC that too
      if (prDoc.requestor?.email && prDoc.requestor.email !== prDoc.requestorEmail) {
        cc.push(prDoc.requestor.email);
      }
      
      // Create notification document
      const notificationRef = collection(db, 'notifications');
      await addDoc(notificationRef, {
        type: 'PR_SUBMITTED' as NotificationType,
        prId: prDoc.id,
        prNumber,
        recipients,
        cc,
        status: 'pending',
        createdAt: serverTimestamp(),
        metadata: {
          requestorName,
          requestorEmail: prDoc.requestorEmail,
          isUrgent: prDoc.isUrgent || false
        },
        emailBody: {
          subject,
          text,
          html
        },
        notification: {
          type: 'NEW_PR',
          prId: prDoc.id,
          prNumber,
          user: {
            requestor: typeof prDoc.requestor === 'string' ? prDoc.requestor : 
              (typeof prDoc.requestor === 'object' && prDoc.requestor !== null ? 
                (prDoc.requestor.name || `${prDoc.requestor.firstName || ''} ${prDoc.requestor.lastName || ''}`.trim() || prDoc.requestor.email) : 
                requestorName),
            name: requestorName,
            metadata: {
              requestorName,
              requestorEmail: prDoc.requestorEmail,
            }
          },
          metadata: {
            requestorName,
            requestorEmail: prDoc.requestorEmail,
            isUrgent: prDoc.isUrgent || false
          }
        }
      });
      
      logger.info(`Notification logged`, { type: 'PR_SUBMITTED', prId: prDoc.id, recipients, status: 'pending' });
      
      return {
        success: true,
        notificationId: notificationRef.id
      };
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
   * Gets the requestor name from PR data
   */
  private async getRequestorName(prDoc: any): Promise<string> {
    logger.debug('Getting requestor name for PR', {
      id: prDoc.id,
      requestorId: prDoc.requestorId,
      requestorEmail: prDoc.requestorEmail,
      requestor: prDoc.requestor
    });
    
    // 1. If we have a requestorId, look up the user in the database
    if (prDoc.requestorId) {
      try {
        const userDoc = await getDoc(doc(db, 'users', prDoc.requestorId));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          
          // Use firstName and lastName if available
          if (userData.firstName && userData.lastName) {
            const fullName = `${userData.firstName} ${userData.lastName}`.trim();
            logger.debug('Using user firstName/lastName from database lookup', fullName);
            return fullName;
          }
          
          // Use name field if available
          if (userData.name) {
            logger.debug('Using user.name from database lookup', userData.name);
            return userData.name;
          }
          
          // Use displayName if available
          if (userData.displayName) {
            logger.debug('Using user.displayName from database lookup', userData.displayName);
            return userData.displayName;
          }
          
          logger.debug('User found but no name fields available', userData);
        } else {
          logger.warn(`User with ID ${prDoc.requestorId} not found in database`);
        }
      } catch (error) {
        logger.error('Error fetching user details', {
          error: error instanceof Error ? error.message : String(error),
          requestorId: prDoc.requestorId
        });
      }
    }
    
    // 2. If we have a requestorEmail, look up the user by email
    if (prDoc.requestorEmail) {
      try {
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('email', '==', prDoc.requestorEmail));
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
          const userData = querySnapshot.docs[0].data();
          
          // Use firstName and lastName if available
          if (userData.firstName && userData.lastName) {
            const fullName = `${userData.firstName} ${userData.lastName}`.trim();
            logger.debug('Using user firstName/lastName from email lookup', fullName);
            return fullName;
          }
          
          // Use name field if available
          if (userData.name) {
            logger.debug('Using user.name from email lookup', userData.name);
            return userData.name;
          }
          
          // Use displayName if available
          if (userData.displayName) {
            logger.debug('Using user.displayName from email lookup', userData.displayName);
            return userData.displayName;
          }
          
          logger.debug('User found by email but no name fields available', userData);
        } else {
          logger.warn(`No user found with email ${prDoc.requestorEmail}`);
        }
      } catch (error) {
        logger.error('Error looking up user by email', {
          error: error instanceof Error ? error.message : String(error),
          requestorEmail: prDoc.requestorEmail
        });
      }
    }
    
    // 3. Check if requestor is an object with name information
    if (prDoc.requestor && typeof prDoc.requestor === 'object') {
      // Use name field if available
      if (prDoc.requestor.name) {
        logger.debug('Using requestor.name from PR', prDoc.requestor.name);
        return prDoc.requestor.name;
      }
      
      // Use firstName and lastName if available
      if (prDoc.requestor.firstName || prDoc.requestor.lastName) {
        const combinedName = `${prDoc.requestor.firstName || ''} ${prDoc.requestor.lastName || ''}`.trim();
        if (combinedName) {
          logger.debug('Using combined firstName/lastName from requestor object', combinedName);
          return combinedName;
        }
      }
      
      // If requestor has an email, look up user by that email
      if (prDoc.requestor.email) {
        try {
          const usersRef = collection(db, 'users');
          const q = query(usersRef, where('email', '==', prDoc.requestor.email));
          const querySnapshot = await getDocs(q);
          
          if (!querySnapshot.empty) {
            const userData = querySnapshot.docs[0].data();
            
            // Use firstName and lastName if available
            if (userData.firstName && userData.lastName) {
              const fullName = `${userData.firstName} ${userData.lastName}`.trim();
              logger.debug('Using user firstName/lastName from requestor.email lookup', fullName);
              return fullName;
            }
            
            // Use name field if available
            if (userData.name) {
              logger.debug('Using user.name from requestor.email lookup', userData.name);
              return userData.name;
            }
            
            // Use displayName if available
            if (userData.displayName) {
              logger.debug('Using user.displayName from requestor.email lookup', userData.displayName);
              return userData.displayName;
            }
            
            logger.debug('User found by requestor.email but no name fields available', userData);
          } else {
            logger.warn(`No user found with email ${prDoc.requestor.email}`);
          }
        } catch (error) {
          logger.error('Error looking up user by requestor.email', {
            error: error instanceof Error ? error.message : String(error),
            requestorEmail: prDoc.requestor.email
          });
        }
      }
    }
    
    // 4. If requestor is a string, it might be a name or email
    if (typeof prDoc.requestor === 'string') {
      // If it doesn't contain @ symbol, assume it's a name
      if (!prDoc.requestor.includes('@')) {
        logger.debug('Using requestor string as name', prDoc.requestor);
        return prDoc.requestor;
      }
      
      // If it contains @ symbol, look up user by email
      try {
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('email', '==', prDoc.requestor));
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
          const userData = querySnapshot.docs[0].data();
          
          // Use firstName and lastName if available
          if (userData.firstName && userData.lastName) {
            const fullName = `${userData.firstName} ${userData.lastName}`.trim();
            logger.debug('Using user firstName/lastName from requestor string email lookup', fullName);
            return fullName;
          }
          
          // Use name field if available
          if (userData.name) {
            logger.debug('Using user.name from requestor string email lookup', userData.name);
            return userData.name;
          }
          
          // Use displayName if available
          if (userData.displayName) {
            logger.debug('Using user.displayName from requestor string email lookup', userData.displayName);
            return userData.displayName;
          }
          
          logger.debug('User found by requestor string email but no name fields available', userData);
        } else {
          logger.warn(`No user found with email ${prDoc.requestor}`);
        }
      } catch (error) {
        logger.error('Error looking up user by requestor string email', {
          error: error instanceof Error ? error.message : String(error),
          requestorEmail: prDoc.requestor
        });
      }
    }
    
    // Last resort - return a placeholder indicating we couldn't find the name
    logger.warn('Could not determine requestor name from any available data');
    return 'Unknown Requestor';
  }
  
  /**
   * Formats a human-readable name from an email address
   */
  private nameFromEmail(email: string): string {
    if (!email || !email.includes('@')) return email;
    
    // Extract username part
    const username = email.split('@')[0];
    
    // Clean and capitalize the username
    return username
      .split(/[._-]/)
      .map((part: string) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join(' ');
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
