/**
 * @fileoverview Purchase Request Service
 * @version 2.0.0
 * 
 * Description:
 * Core service for managing purchase requests in the system. Handles CRUD operations,
 * status transitions, approval routing, and file attachments.
 * 
 * Architecture Notes:
 * - Uses Firebase Firestore for data persistence
 * - Integrates with Cloud Storage for attachments
 * - Implements complex business logic for approver routing
 * - Manages PR status transitions and validations
 * 
 * Business Rules:
 * - PR approval thresholds are configured in the Rules collection and managed by administrators
 * - Approval levels are determined dynamically based on PR amount and configured thresholds
 * - Multiple quotes may be required based on thresholds in Rules collection
 * - Finance approval requirements are defined in Rules collection
 * - Preferred vendors may bypass quote requirements
 * - Department heads must be in approval chain
 * 
 * Related Modules:
 * - src/services/storage.ts: File handling
 * - src/services/notification.ts: PR notifications
 * - src/types/pr.ts: PR type definitions
 * 
 * Error Handling:
 * - Network errors are caught and reported
 * - Validation errors trigger user feedback
 * - Failed operations are logged for debugging
 */

import { 
  doc, 
  getDoc, 
  getDocs, 
  updateDoc, 
  collection, 
  query, 
  where,
  limit,
  Timestamp, 
  arrayUnion,
  addDoc,
  deleteDoc,
  writeBatch,
  serverTimestamp,
  DocumentData,
  DocumentSnapshot,
  QuerySnapshot
} from 'firebase/firestore';
import { getFirestore } from 'firebase/firestore';
import { app } from '../config/firebase';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { 
  PRRequest, 
  PRStatus, 
  LineItem, 
  Quote, 
  ApprovalWorkflow,
  ApprovalHistoryItem,
  PR_AMOUNT_THRESHOLDS,
  UserReference,
  HistoryItem,
  PRMetrics,
  PRUpdateParams
} from '../types/pr';
import { User } from '../types/user';
import { Rule } from '../types/referenceData';
import { calculateDaysOpen } from '../utils/formatters';
import { StorageService } from './storage';
import { notificationService } from './notification';
import { auth } from '../config/firebase';
import { UserRole } from '../types/user';
import { PERMISSION_LEVELS } from '../config/permissions';
import { submitPRNotification } from './notifications/handlers/submitPRNotification';
import { mapFirebaseUserToUserReference, mapFirebaseUserToPartialUser } from '../utils/userMapper';
import { NotificationService } from './notifications/notificationService';
import { NotificationType } from '../types/notification';

const PR_COLLECTION = 'purchaseRequests';
const functions = getFunctions();
const sendPRNotificationV2 = httpsCallable(functions, 'sendPRNotificationV2');

/**
 * Converts Firestore timestamp to ISO string for Redux
 * @param {any} data - Data to convert
 * @returns {any} Converted data
 */
function convertTimestamps(obj: any): any {
  if (!obj) return obj;

  if (obj instanceof Timestamp) {
    return obj.toDate().toISOString();
  }

  if (Array.isArray(obj)) {
    return obj.map(item => convertTimestamps(item));
  }

  if (typeof obj === 'object') {
    const converted: any = {};
    for (const key in obj) {
      if (key === 'timestamp' && obj[key] instanceof Timestamp) {
        converted[key] = obj[key].toDate().toISOString();
      } else if (key === 'statusHistory' && Array.isArray(obj[key])) {
        converted[key] = obj[key].map((historyItem: any) => ({
          ...historyItem,
          timestamp: historyItem.timestamp instanceof Timestamp 
            ? historyItem.timestamp.toDate().toISOString()
            : historyItem.timestamp
        }));
      } else if (key === 'workflowHistory' && Array.isArray(obj[key])) {
        converted[key] = obj[key].map((historyItem: any) => ({
          ...historyItem,
          timestamp: historyItem.timestamp instanceof Timestamp 
            ? historyItem.timestamp.toDate().toISOString()
            : historyItem.timestamp
        }));
      } else {
        converted[key] = convertTimestamps(obj[key]);
      }
    }
    return converted;
  }

  return obj;
};

/**
 * Calculates metrics for a PR
 * @param {PRRequest} pr - The purchase request
 * @param {Partial<PRMetrics>} existingMetrics - Existing metrics (optional)
 * @returns {PRMetrics} Updated metrics
 */
const calculatePRMetrics = (pr: PRRequest, existingMetrics: Partial<PRMetrics> = {}): PRMetrics => {
  console.log('Calculating metrics for PR:', JSON.stringify({
    id: pr.id,
    isUrgent: pr.isUrgent
  }, null, 2));
  
  const metrics: PRMetrics = {
    daysOpen: calculateDaysOpen(pr.createdAt),
    isUrgent: pr.isUrgent || false,
    isOverdue: existingMetrics.isOverdue || false,
    quotesRequired: existingMetrics.quotesRequired || false,
    adjudicationRequired: existingMetrics.adjudicationRequired || false,
    financeApprovalRequired: existingMetrics.financeApprovalRequired || false,
    customsClearanceRequired: existingMetrics.customsClearanceRequired || false,
    completionPercentage: existingMetrics.completionPercentage || 0,
    // Preserve other metrics if they exist
    daysInCurrentStatus: existingMetrics.daysInCurrentStatus || 0,
    expectedDeliveryDate: existingMetrics.expectedDeliveryDate || null,
    expectedLandingDate: existingMetrics.expectedLandingDate || null,
    queuePosition: existingMetrics.queuePosition || null,
    daysOrdered: existingMetrics.daysOrdered || 0,
    daysOverdue: existingMetrics.daysOverdue || 0,
    timeToClose: existingMetrics.timeToClose || 0
  };

  return metrics;
};

/**
 * Purchase Request Service
 */
// Define PR service object
export const prService = {
  /**
   * Creates a new purchase request
   * @param {Partial<PRRequest>} prData - Purchase request data
   * @returns {Promise<string>} ID of the created purchase request
   */
  async createPR(prData: Partial<PRRequest>): Promise<string> {
    try {
      console.log('Creating PR with data:', JSON.stringify({
        organization: prData.organization,
        requestorId: prData.requestorId,
        isUrgent: prData.isUrgent
      }, null, 2));

      // Validate required fields
      if (!prData.organization) {
        throw new Error('organization is required');
      }
      if (!prData.requestorId) {
        throw new Error('requestorId is required');
      }

      // Get current user for audit fields
      const firebaseUser = auth.currentUser;
      if (!firebaseUser) {
        throw new Error('No authenticated user');
      }
      
      // Map Firebase user to UserReference
      const userRef = mapFirebaseUserToUserReference(firebaseUser);
      if (!userRef) {
        throw new Error('Failed to map user data');
      }

      // Create PR document
      const pr = {
        ...prData,
        status: PRStatus.SUBMITTED,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        submittedBy: userRef.id,
        requestorId: userRef.id,
        requestorEmail: userRef.email,
        requestor: {
          id: userRef.id,
          email: userRef.email,
          name: userRef.name
        },
        approver: prData.approver || null,
        history: [] as HistoryItem[],
        attachments: [],
        metrics: {
          daysOpen: 0,
          isUrgent: prData.isUrgent || false,
          isOverdue: false,
          quotesRequired: false,
          adjudicationRequired: false,
          financeApprovalRequired: false,
          customsClearanceRequired: false,
          completionPercentage: 0
        }
      };

      // Add to history
      pr.history.push({
        action: 'CREATED',
        timestamp: new Date().toISOString(),
        user: userRef,
        comment: 'Purchase request created'
      });

      // Create document
      const docRef = await addDoc(collection(getFirestore(app), PR_COLLECTION), pr);
      console.log('PR created with ID:', JSON.stringify(docRef.id, null, 2));

      // Send notification via the dedicated notification service
      try {
        // Use the dedicated notification service instead of sending directly
        await submitPRNotification.createNotification({ ...pr, id: docRef.id }, pr.prNumber);
        console.log('PR creation notification sent successfully via notification service');
      } catch (error) {
        console.error('Failed to send PR creation notification:', error);
        
        // Log detailed error information for debugging
        if (error && typeof error === 'object') {
          if ('code' in error) console.error('Error code:', (error as any).code);
          if ('message' in error) console.error('Error message:', (error as any).message);
          if ('details' in error) console.error('Error details:', (error as any).details);
        }
        
        // Create a notification log entry to track the failure
        try {
          const notificationService = new NotificationService();
          await notificationService.logNotification(
            'ERROR' as NotificationType,
            docRef.id,
            [prData.requestorEmail || '', 'procurement@1pwrafrica.com'].filter(Boolean),
            'failed',
            {
              error: error ? JSON.stringify(error) : 'Unknown error',
              errorTimestamp: new Date().toISOString(),
              attemptedAction: 'PR_CREATION_NOTIFICATION'
            }
          );
        } catch (logError) {
          console.error('Failed to log notification error:', logError);
        }
        
        // Don't throw error, as PR is already created
      }

      // Log notification in Firestore
      const prWithId = { 
        ...pr, 
        id: docRef.id,
        // Ensure all required fields are present
        approvalWorkflow: {
          currentApprover: prData.approver || '',
          approvalHistory: [],
          lastUpdated: new Date().toISOString()
        }
      } as PRRequest;
      
      await notificationService.createNotification(
        prWithId,
        null,  // No previous status for new PR
        PRStatus.SUBMITTED,
        {
          id: prData.requestorId!,
          email: prData.requestorEmail!,
          name: prData.requestor?.name || 'Unknown',
          organization: prData.organization!
        } as User,
        `PR ${pr.prNumber || docRef.id} created`
      );

      return docRef.id;
    } catch (error) {
      console.error('Error creating PR:', JSON.stringify(error, null, 2));
      throw error;
    }
  },

  /**
   * Generates a unique PR number for the given organization
   * @param {string} organization - Organization name
   * @returns {Promise<string>} Unique PR number
   */
  async generatePRNumber(organization: string, attempt: number = 1): Promise<string> {
    try {
      // Get current year and month in YYYYMM format
      const now = new Date();
      const yearMonth = now.getFullYear().toString() + 
                       (now.getMonth() + 1).toString().padStart(2, '0');
      
      console.log('Generating PR number for yearMonth:', yearMonth);

      // Query for all PRs for this organization
      const q = query(
        collection(getFirestore(app), PR_COLLECTION),
        where('organization', '==', organization)
      );

      const querySnapshot = await getDocs(q);
      
      // Filter for current month client-side
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      
      console.log('Filtering PRs between:', startOfMonth, 'and', endOfMonth);
      
      const thisMonthPRs = querySnapshot.docs.filter(doc => {
        const data = doc.data();
        if (!data.createdAt) return false;
        
        // Handle both Firestore Timestamp and Date objects
        const createdAt = data.createdAt instanceof Date 
          ? data.createdAt 
          : data.createdAt.toDate?.() || new Date(data.createdAt);
          
        return createdAt >= startOfMonth && createdAt <= endOfMonth;
      });

      console.log('Found', thisMonthPRs.length, 'PRs for this month');

      // Find the highest number used this month
      let maxNumber = 0;
      thisMonthPRs.forEach(doc => {
        const prNumber = doc.data().prNumber;
        if (prNumber && prNumber.startsWith(`PR-${yearMonth}-`)) {
          const num = parseInt(prNumber.split('-')[2]);
          if (!isNaN(num) && num > maxNumber) {
            maxNumber = num;
            console.log('Found higher PR number:', num);
          }
        }
      });

      // Use the next number after the highest found, plus any additional attempts
      const nextNumber = maxNumber + attempt;
      console.log('Next PR number:', nextNumber);

      // Format: PR-YYYYMM-XXX where XXX is sequential number
      const prNumber = `PR-${yearMonth}-${nextNumber.toString().padStart(3, '0')}`;
      console.log('Generated PR number:', prNumber);

      // Double-check uniqueness
      const existingQ = query(
        collection(getFirestore(app), PR_COLLECTION),
        where('prNumber', '==', prNumber)
      );
      const existingDocs = await getDocs(existingQ);
      
      if (!existingDocs.empty) {
        console.log('PR number collision detected:', prNumber, 'Attempt:', attempt);
        // If there's a collision, try the next number by incrementing attempt
        return this.generatePRNumber(organization, attempt + 1);
      }

      return prNumber;
    } catch (error) {
      console.error('Error generating PR number:', error);
      throw error;
    }
  },

  /**
   * Creates a new purchase request with a generated PR number
   * @param {Partial<PRRequest>} prData - Purchase request data
   * @returns {Promise<string>} ID of the created purchase request
   */
  async createPRWithNumber(prData: Partial<PRRequest>): Promise<string> {
    try {
      console.log('Creating PR with data:', JSON.stringify({
        organization: prData.organization,
        requestorId: prData.requestorId,
        isUrgent: prData.isUrgent
      }, null, 2));

      // Validate required fields
      if (!prData.organization) {
        throw new Error('organization is required');
      }
      if (!prData.requestorId) {
        throw new Error('requestorId is required');
      }

      // Generate PR number
      const prNumber = await this.generatePRNumber(prData.organization);
      console.log('Generated PR number:', JSON.stringify(prNumber, null, 2));

      // Get current user for audit fields
      const firebaseUser = auth.currentUser;
      if (!firebaseUser) {
        throw new Error('No authenticated user');
      }
      
      // Map Firebase user to UserReference
      const userRef = mapFirebaseUserToUserReference(firebaseUser);
      if (!userRef) {
        throw new Error('Failed to map user data');
      }

      // Create PR document
      const pr = {
        ...prData,
        prNumber,
        status: PRStatus.SUBMITTED,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        submittedBy: userRef.id,
        requestorId: userRef.id,
        requestorEmail: userRef.email,
        requestor: {
          id: userRef.id,
          email: userRef.email,
          name: userRef.name
        },
        approver: prData.approver || null,
        history: [] as HistoryItem[],
        attachments: [],
        metrics: {
          daysOpen: 0,
          isUrgent: prData.isUrgent || false,
          isOverdue: false,
          quotesRequired: false,
          adjudicationRequired: false,
          financeApprovalRequired: false,
          customsClearanceRequired: false,
          completionPercentage: 0
        }
      };

      // Add to history
      pr.history.push({
        action: 'CREATED',
        timestamp: new Date().toISOString(),
        user: userRef,
        comment: 'Purchase request created'
      });

      // Create document
      const docRef = await addDoc(collection(getFirestore(app), PR_COLLECTION), pr);
      console.log('PR created with ID:', JSON.stringify(docRef.id, null, 2));

      // Send notification via the dedicated notification service
      try {
        // Use the dedicated notification service instead of sending directly
        await submitPRNotification.createNotification({ ...pr, id: docRef.id }, pr.prNumber);
        console.log('PR creation notification sent successfully via notification service');
      } catch (error) {
        console.error('Failed to send PR creation notification:', error);
        
        // Log detailed error information for debugging
        if (error && typeof error === 'object') {
          if ('code' in error) console.error('Error code:', (error as any).code);
          if ('message' in error) console.error('Error message:', (error as any).message);
          if ('details' in error) console.error('Error details:', (error as any).details);
        }
        
        // Create a notification log entry to track the failure
        try {
          const notificationService = new NotificationService();
          await notificationService.logNotification(
            'ERROR' as NotificationType,
            docRef.id,
            [prData.requestorEmail || '', 'procurement@1pwrafrica.com'].filter(Boolean),
            'failed',
            {
              error: error ? JSON.stringify(error) : 'Unknown error',
              errorTimestamp: new Date().toISOString(),
              attemptedAction: 'PR_CREATION_NOTIFICATION'
            }
          );
        } catch (logError) {
          console.error('Failed to log notification error:', logError);
        }
        
        // Don't throw error, as PR is already created
      }

      // Log notification in Firestore
      const prWithId = { 
        ...pr, 
        id: docRef.id,
        // Ensure all required fields are present
        approvalWorkflow: {
          currentApprover: prData.approver || '',
          approvalHistory: [],
          lastUpdated: new Date().toISOString()
        }
      } as PRRequest;
      
      await notificationService.createNotification(
        prWithId,
        null,  // No previous status for new PR
        PRStatus.SUBMITTED,
        {
          id: prData.requestorId!,
          email: prData.requestorEmail!,
          name: prData.requestor?.name || 'Unknown',
          organization: prData.organization!
        } as User,
        `PR ${pr.prNumber || docRef.id} created`
      );

      return docRef.id;
    } catch (error) {
      console.error('Error creating PR:', JSON.stringify(error, null, 2));
      throw error;
    }
  },

  /**
   * Updates an existing purchase request
   * @param {string} prId - ID of the purchase request to update
   * @param {PRUpdateParams} updates - Updated purchase request data
   * @returns {Promise<void>}
   */
  async updatePR(prId: string, updates: PRUpdateParams): Promise<void> {
    try {
      console.log('Updating PR:', JSON.stringify({ prId, updates }, null, 2));
      
      const prRef = doc(getFirestore(app), PR_COLLECTION, prId);
      
      // Get current PR data
      const prSnapshot = await getDoc(prRef);
      if (!prSnapshot.exists()) {
        throw new Error('PR not found');
      }
      
      const prData = prSnapshot.data();
      
      // Initialize or update approval workflow
      let approvalWorkflow = prData.approvalWorkflow || {
        currentApprover: null,
        approvalHistory: [],
        lastUpdated: Timestamp.fromDate(new Date())
      };

      // Check for discrepancies between legacy approver field and approval workflow
      if (prData.approver && approvalWorkflow.currentApprover && 
          prData.approver !== approvalWorkflow.currentApprover) {
        console.warn('PR Service: Discrepancy detected between PR approver and approvalWorkflow', {
          prId,
          prApprover: prData.approver,
          type: typeof prData.approver
        });
        
        // Fix the discrepancy by updating workflow to match PR approver
        approvalWorkflow.currentApprover = prData.approver;
        console.log('PR Service: Corrected approvalWorkflow.currentApprover to match PR.approver');
      }
      
      // If approver is being updated, update the workflow and add to history
      if (updates.approver) {
        const newApproverId = updates.approver;
        const currentApproverId = prData.approver; // Use PR.approver as source of truth
        
        console.log('PR Service: Updating approver', {
          prId,
          currentApproverId: currentApproverId || 'Not set',
          newApproverId,
          previousApprovers: prData.approvers || []
        });
        
        // Add to approval history if the approver is changing
        if (currentApproverId !== newApproverId) {
          const newHistoryItem = {
            approverId: newApproverId,
            timestamp: new Date().toISOString(),
            approved: false,
            notes: typeof updates.notes === 'string' ? updates.notes : 'Approver reassigned'
          };
          
          approvalWorkflow = {
            ...approvalWorkflow,
            currentApprover: newApproverId, // Mirror PR.approver in approval workflow
            approvalHistory: [...approvalWorkflow.approvalHistory, newHistoryItem],
            lastUpdated: Timestamp.fromDate(new Date())
          };
          
          console.log('PR Service: Added approver change to history', {
            previousApprover: currentApproverId,
            newApprover: newApproverId
          });
        } else {
          // Just update the timestamp if the approver didn't change
          approvalWorkflow = {
            ...approvalWorkflow,
            currentApprover: newApproverId, // Still mirror PR.approver
            lastUpdated: Timestamp.fromDate(new Date())
          };
        }
      }
      
      // Merge updates with current data
      const finalUpdates = {
        ...updates,
        approvalWorkflow,
        approver: updates.approver || prData.approver, // Update approver field
        updatedAt: Timestamp.fromDate(new Date()),
        isUrgent: updates.isUrgent ?? prData.isUrgent ?? false
      };
      
      console.log('Final updates:', JSON.stringify(finalUpdates, null, 2));
      await updateDoc(prRef, finalUpdates);
    } catch (error) {
      console.error('Error updating PR:', JSON.stringify(error, null, 2));
      throw error;
    }
  },

  /**
   * Updates multiple purchase requests
   * @param {string[]} prIds - IDs of the purchase requests to update
   * @param {PRUpdateParams} updates - Updated purchase request data
   * @returns {Promise<void>}
   */
  async updatePRs(prIds: string[], updates: PRUpdateParams): Promise<void> {
    try {
      console.log('Updating PRs:', JSON.stringify({ prIds, updates }, null, 2));
      
      const batch = writeBatch(getFirestore(app));
      
      // Get all PR refs and current data
      const prRefs = await Promise.all(prIds.map(async (prId) => {
        const ref = doc(getFirestore(app), PR_COLLECTION, prId);
        const snapshot = await getDoc(ref);
        if (!snapshot.exists()) {
          throw new Error(`PR not found: ${prId}`);
        }
        return { ref, data: snapshot.data() };
      }));
      
      // Add updates to batch
      prRefs.forEach(({ ref, data }) => {
        const finalUpdates = {
          ...updates,
          updatedAt: Timestamp.fromDate(new Date()),
          isUrgent: updates.isUrgent ?? data.isUrgent ?? false
        };
        batch.update(ref, finalUpdates);
      });
      
      // Commit all updates
      await batch.commit();
      
      console.log('Successfully updated PRs:', JSON.stringify(prIds, null, 2));
    } catch (error) {
      console.error('Error updating PRs:', JSON.stringify(error, null, 2));
      throw error;
    }
  },

  /**
   * Get PRs for a specific user in an organization
   * @param userId User ID
   * @param organization Organization name
   * @param filterToUser Optional, if true only show PRs created by or assigned to the user
   */
  async getUserPRs(userId: string, organization: string, filterToUser: boolean = false): Promise<PRRequest[]> {
    try {
      console.log('PR Service: Fetching PRs:', { userId, organization, filterToUser });
      
      // Get user permissions from auth
      const firebaseUser = auth.currentUser;
      if (!firebaseUser) {
        throw new Error('User not authenticated');
      }
      
      // Map Firebase user to UserReference
      const userRef = mapFirebaseUserToUserReference(firebaseUser);
      if (!userRef) {
        throw new Error('Failed to map user data');
      }

      // Get user details and permission level
      const userDoc = await getDoc(doc(getFirestore(app), 'users', userId));
      if (!userDoc.exists()) {
        console.error('User document not found:', userId);
        return [];
      }

      const userData = userDoc.data();
      console.log('User data loaded:', { userId, permissionLevel: userData?.permissionLevel });

      // If filterToUser is true, show only PRs created by or assigned to the user
      // This applies to ALL users, regardless of permission level
      if (filterToUser) {
        console.log('Filtering to user PRs and approvals');
        
        // We need to do multiple queries and combine results
        const [createdPRs, assignedPRs, workflowPRs] = await Promise.all([
          // Query for PRs created by user
          getDocs(query(
            collection(getFirestore(app), PR_COLLECTION),
            where('organization', '==', organization),
            where('createdBy.id', '==', userId)
          )),
          // Query for PRs where user is in approvers array
          getDocs(query(
            collection(getFirestore(app), PR_COLLECTION),
            where('organization', '==', organization),
            where('approvers', 'array-contains', userId)
          )),
          // Query for PRs where user is the workflow approver
          getDocs(query(
            collection(getFirestore(app), PR_COLLECTION),
            where('organization', '==', organization),
            where('workflow.procurementReview.approver.id', '==', userId)
          ))
        ]);

        // Combine results, removing duplicates by PR ID
        const prMap = new Map();
        [...createdPRs.docs, ...assignedPRs.docs, ...workflowPRs.docs].forEach(doc => {
          if (!prMap.has(doc.id)) {
            const data = doc.data();
            prMap.set(doc.id, {
              id: doc.id,
              ...convertTimestamps(data)
            });
          }
        });

        // Convert map to array and sort
        const prs = Array.from(prMap.values()) as PRRequest[];
        return prs.sort((a, b) => {
          if (a.isUrgent !== b.isUrgent) {
            return a.isUrgent ? -1 : 1;
          }
          return (b.createdAt || '').localeCompare(a.createdAt || '');
        });
      }

      // If not filtering to user, show all PRs in the organization
      console.log('Showing all PRs');
      const q = query(
        collection(getFirestore(app), PR_COLLECTION),
        where('organization', '==', organization)
      );
      
      const querySnapshot = await getDocs(q);
      console.log('PR Service: Found PRs:', {
        count: querySnapshot.size,
        organization,
        prs: querySnapshot.docs.map(doc => ({
          id: doc.id,
          prNumber: doc.data().prNumber,
          organization: doc.data().organization,
          status: doc.data().status,
          createdBy: doc.data().createdBy
        }))
      });

      // Convert to array and sort
      const prs = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...convertTimestamps(data)
        };
      });

      return prs.sort((a, b) => {
        if (a.isUrgent !== b.isUrgent) {
          return a.isUrgent ? -1 : 1;
        }
        return (b.createdAt || '').localeCompare(a.createdAt || '');
      });
    } catch (error) {
      console.error('Error fetching user PRs:', error);
      throw error;
    }
  },

  /**
   * Retrieves pending approvals for a given approver
   * @param {string} approverId - ID of the approver
   * @param {string} organization - Organization name
   * @returns {Promise<PRRequest[]>} List of pending approvals for the approver
   */
  getPendingApprovals: async (approverId: string, organization?: string): Promise<PRRequest[]> => {
    try {
      console.log('PR Service: Fetching pending approvals:', { approverId, organization });
      
      // Build query conditions
      const conditions: any[] = [
        where('status', '==', PRStatus.SUBMITTED),
        where('approver', '==', approverId)
      ];
      
      // Add organization filter if provided
      if (organization) {
        conditions.push(where('organization', '==', organization));
      }
      
      const q = query(collection(getFirestore(app), PR_COLLECTION), ...conditions);
      const querySnapshot = await getDocs(q);
      
      console.log('PR Service: Found pending approvals:', {
        count: querySnapshot.size,
        organization,
        prs: querySnapshot.docs.map(doc => ({
          id: doc.id,
          prNumber: doc.data().prNumber,
          organization: doc.data().organization
        }))
      });
      
      // Convert to array and sort
      const prs = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...convertTimestamps(doc.data())
      })) as PRRequest[];

      // Sort by urgency first, then by creation date
      return prs.sort((a, b) => {
        if (a.isUrgent !== b.isUrgent) {
          return a.isUrgent ? -1 : 1;
        }
        return (b.createdAt || '').localeCompare(a.createdAt || '');
      });
    } catch (error) {
      console.error('Error fetching pending approvals:', error);
      throw error;
    }
  },

  /**
   * Updates the status of a purchase request
   * @param {string} prId - ID of the purchase request
   * @param {PRStatus} status - New status of the purchase request
   * @param {string} notes - Optional notes about the status change
   * @param {User | UserReference} user - User who updated the status
   * @returns {Promise<void>}
   */
  async updatePRStatus(
    prId: string, 
    newStatus: PRStatus,
    notes?: string,
    user?: User | UserReference
  ): Promise<void> {
    try {
      const prRef = doc(getFirestore(app), PR_COLLECTION, prId);
      const prDoc = await getDoc(prRef);

      if (!prDoc.exists()) {
        throw new Error('PR not found');
      }

      const prData = prDoc.data();
      const oldStatus = prData.status;

      // Check permissions for status change
      if (!user) {
        throw new Error('User is required to update PR status');
      }

      // Only procurement (level 2,3) can move POs between statuses
      const isProcurement = user.permissionLevel === 2 || user.permissionLevel === 3;
      const isPO = prData.type === 'PO' || oldStatus === PRStatus.ORDERED || oldStatus === PRStatus.PARTIALLY_RECEIVED;
      
      if (isPO && !isProcurement) {
        throw new Error('Only procurement team members can update PO status');
      }

      // Only requestor can cancel their own PR
      if (newStatus === PRStatus.CANCELED) {
        const isRequestor = user.id === prData.requestor?.id;
        if (!isRequestor && !isProcurement) {
          throw new Error('Only the requestor or procurement team can cancel a PR');
        }
      }

      // Only procurement can push to approval
      if (newStatus === PRStatus.PENDING_APPROVAL && !isProcurement) {
        throw new Error('Only procurement team members can push PRs to approval');
      }

      // Only approver or procurement can move from PENDING_APPROVAL to IN_QUEUE
      if (oldStatus === PRStatus.PENDING_APPROVAL && newStatus === PRStatus.IN_QUEUE) {
        const isApprover = user.id === prData.approvalWorkflow?.currentApprover?.id ||
          prData.approver === user.id;
        if (!isApprover && !isProcurement) {
          throw new Error('Only the current approver or procurement team can return a PR to queue');
        }
      }

      let updates: any = {
        status: newStatus,
        lastModifiedBy: user?.email || 'system@1pwrafrica.com',
        lastModifiedAt: serverTimestamp(),
      };

      if (oldStatus === PRStatus.IN_QUEUE && newStatus === PRStatus.PENDING_APPROVAL && prData.type === 'PR') {
        updates.type = 'PO';
        console.log('Converting PR to PO:', { prId, oldStatus, newStatus });
      }

      // Create workflow history entry
      const workflowEntry = {
        type: 'STATUS_CHANGE',
        fromStatus: oldStatus,
        toStatus: newStatus,
        step: newStatus,
        timestamp: Timestamp.now(),
        user: {
          id: user?.id || 'system',
          email: user?.email || 'system@1pwrafrica.com',
          name: user?.firstName && user?.lastName 
            ? `${user.firstName} ${user.lastName}`
            : user?.email?.split('@')[0] || 'System'
        },
        notes: notes || ''
      };

      console.log('PR status updated:', {
        prId,
        oldStatus,
        newStatus,
        workflowEntry,
        user: user?.email,
        type: updates.type || prData.type
      });
      
      // Special handling for DRAFT to SUBMITTED transition to ensure approver is set
      if (oldStatus === PRStatus.DRAFT && newStatus === PRStatus.SUBMITTED) {
        // Ensure approvalWorkflow structure exists
        let approvalWorkflow = prData.approvalWorkflow || {
          currentApprover: null,
          approvalHistory: [],
          lastUpdated: Timestamp.fromDate(new Date())
        };
        
        // Ensure approvalWorkflow.currentApprover mirrors PR.approver (source of truth)
        if (approvalWorkflow.currentApprover !== prData.approver) {
          console.log('Synchronizing approvalWorkflow.currentApprover with PR.approver:', {
            prId,
            prApprover: prData.approver || 'Not set',
            workflowApprover: approvalWorkflow.currentApprover || 'Not set'
          });
          
          approvalWorkflow.currentApprover = prData.approver;
          updates.approvalWorkflow = approvalWorkflow;
        }
        
        // Make sure submittedAt is set
        updates.submittedAt = Timestamp.now();
      }

      // Update PR status and add to workflow history
      updates.workflowHistory = arrayUnion(workflowEntry);
      await updateDoc(prRef, updates);

      // Reload the PR with updated data for notification
      const updatedPrDoc = await getDoc(prRef);
      const updatedPrData = updatedPrDoc.data();
      
      // Send notification if we have the updated PR data
      if (updatedPrData) {
        await notificationService.createNotification(
          {
            id: prId,
            ...updatedPrData,
            prNumber: updatedPrData.prNumber,
            organization: updatedPrData.organization || '',
            department: updatedPrData.department || '',
            projectCategory: updatedPrData.projectCategory || '',
            description: updatedPrData.description || '',
            site: updatedPrData.site || '',
            expenseType: updatedPrData.expenseType || '',
            estimatedAmount: updatedPrData.estimatedAmount || 0,
            currency: updatedPrData.currency || '',
            requiredDate: updatedPrData.requiredDate || '',
            requestorId: updatedPrData.requestorId || '',
            requestorEmail: updatedPrData.requestorEmail || '',
            requestor: updatedPrData.requestor || { id: '', email: '' },
            lineItems: updatedPrData.lineItems || []
          } as unknown as PRRequest,
          oldStatus,
          newStatus,
          user,
          notes || ''
        );
      } else {
        console.error(`Failed to send notification: Could not retrieve updated PR data for PR ${prId}`);
      }
    } catch (error) {
      console.error('Error updating PR status:', error);
      throw new Error(`Failed to update PR status: ${error instanceof Error ? error.message : String(error)}`);
    }
  },

  /**
   * Deletes a purchase request
   * @param {string} prId - ID of the purchase request to delete
   * @returns {Promise<void>}
   */
  async deletePR(prId: string): Promise<void> {
    try {
      // Get PR data to get line item IDs
      const prRef = doc(getFirestore(app), PR_COLLECTION, prId);
      const prDoc = await getDoc(prRef);
      
      if (!prDoc.exists()) {
        console.log(`PR ${prId} not found, nothing to delete`);
        return;
      }
      
      const pr = {
        id: prId,
        ...prDoc.data()
      } as PRRequest;

      // Delete line item attachments
      if (pr.lineItems && pr.lineItems.length > 0) {
        await Promise.all(pr.lineItems.map(async (lineItem: LineItem) => {
          if (lineItem.attachments && lineItem.attachments.length > 0) {
            await Promise.all(lineItem.attachments.map(async (file) => {
              if (file.url && typeof file.url === 'string') {
                try {
                  await StorageService.deleteFile(file.url);
                  console.log('Deleted line item attachment:', file.url);
                } catch (attachmentError) {
                  console.error('Error deleting line item attachment:', 
                    JSON.stringify({
                      url: file.url,
                      error: attachmentError instanceof Error ? attachmentError.message : String(attachmentError)
                    }, null, 2)
                  );
                }
              } else {
                console.error('Invalid file URL:', JSON.stringify(file.url, null, 2));
              }
            }));
          }
        }));
      }

      // Delete PR document
      await deleteDoc(doc(getFirestore(app), PR_COLLECTION, prId));
      console.log(`PR ${prId} deleted successfully`);
    } catch (error) {
      console.error('Error deleting PR:', error instanceof Error ? error.message : String(error));
      throw new Error(`Failed to delete PR: ${error instanceof Error ? error.message : String(error)}`);
    }
  },

  /**
   * Retrieves a purchase request by ID or PR number
   * @param {string} prId - ID or PR number of the purchase request
   * @returns {Promise<PRRequest | null>} Purchase request data or null if not found
   */
  async getPR(prId: string): Promise<PRRequest | null> {
    try {
      // First try to get PR by ID
      let prRef = doc(getFirestore(app), PR_COLLECTION, prId);
      let prDoc = await getDoc(prRef);

      if (!prDoc.exists()) {
        // If not found by ID, try to find by PR number
        const q = query(
          collection(getFirestore(app), PR_COLLECTION),
          where('prNumber', '==', prId)
        );
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          prDoc = querySnapshot.docs[0];
          prId = prDoc.id;
        } else {
          return null;
        }
      }

      let prData = {
        id: prId,
        ...prDoc.data(),
        workflowHistory: prDoc.data()?.workflowHistory || [],
        statusHistory: prDoc.data()?.statusHistory || []
      } as unknown as PRRequest;

      // Initialize approver if missing
      if (!prData.approver) {
        console.log('PR Service: No approver assigned for PR:', prId);
        console.log('PR Service: Checking for approver - PR data:', {
          approver: prData.approver || 'Not set',
          approvalWorkflow: prData.approvalWorkflow ? 
            `currentApprover: ${prData.approvalWorkflow.currentApprover}` : 'Not set'
        });
        
        // If no approver is assigned but we have an approval workflow with a current approver,
        // use that as the approver for backward compatibility
        if (prData.approvalWorkflow?.currentApprover) {
          prData.approver = prData.approvalWorkflow.currentApprover;
          console.log('PR Service: Using approval workflow current approver:', prData.approver);
        }
      }

      // Convert timestamps to ISO strings
      return convertTimestamps(prData) as PRRequest;
    } catch (error) {
      console.error('Error getting PR:', JSON.stringify(error, null, 2));
      throw error;
    }
  },

  /**
   * Deletes a quote from a PR
   * @param {string} prId - ID of the PR
   * @param {string} quoteId - ID of the quote to delete
   * @returns {Promise<void>}
   */
  async deleteQuote(prId: string, quoteId: string): Promise<void> {
    try {
      if (!prId || !quoteId) {
        throw new Error('PR ID and Quote ID are required');
      }

      const db = getFirestore(app);
      if (!db) {
        throw new Error('Firestore instance not available');
      }

      const prRef = doc(db, PR_COLLECTION, prId);
      const prDoc = await getDoc(prRef);
      
      if (!prDoc.exists()) {
        throw new Error('PR not found');
      }

      const pr = prDoc.data() as PRRequest;
      if (pr.status !== PRStatus.IN_QUEUE) {
        throw new Error('Quotes can only be deleted when PR is in queue');
      }

      // Ensure quotes array exists and is properly typed
      const quotes: Quote[] = Array.isArray(pr.quotes) ? pr.quotes : [];
      
      // Filter out the quote to delete
      const updatedQuotes: Quote[] = quotes.filter(q => q && q.id !== quoteId);

      // Create a timestamp manually to avoid any undefined issues
      const timestamp = Timestamp.now();
      
      // Update the document with the filtered quotes array
      await updateDoc(prRef, {
        quotes: updatedQuotes,
        updatedAt: timestamp
      });

      console.log('Quote deleted successfully:', { prId, quoteId });
    } catch (error) {
      console.error('Error deleting quote:', error instanceof Error ? error.message : String(error));
      throw error;
    }
  },

  /**
   * Updates a quote in a PR
   * @param {string} prId - ID of the PR
   * @param {Quote} quote - Updated quote data
   * @returns {Promise<void>}
   */
  async updateQuote(prId: string, quote: Quote): Promise<void> {
    try {
      // Input validation
      if (!prId) {
        throw new Error('PR ID is required');
      }
      
      if (!quote || !quote.id) {
        throw new Error('Valid quote with ID is required');
      }

      const db = getFirestore(app);
      if (!db) {
        throw new Error('Firestore instance not available');
      }

      // Get PR document
      const prRef = doc(db, PR_COLLECTION, prId);
      const prDoc = await getDoc(prRef);
      
      if (!prDoc.exists()) {
        throw new Error('PR not found');
      }

      // Validate PR status
      const pr = prDoc.data() as PRRequest;
      if (pr.status !== PRStatus.IN_QUEUE) {
        throw new Error('Quotes can only be modified when PR is in queue');
      }

      // Ensure quotes array exists
      const quotes: Quote[] = Array.isArray(pr.quotes) ? pr.quotes : [];
      
      // Create new quotes array with the updated quote
      const updatedQuotes: Quote[] = [];
      let quoteFound = false;
      
      for (const q of quotes) {
        if (q && q.id === quote.id) {
          updatedQuotes.push(quote);
          quoteFound = true;
        } else if (q) {
          updatedQuotes.push(q);
        }
      }
      
      // If quote wasn't found, add it
      if (!quoteFound) {
        updatedQuotes.push(quote);
      }

      // Create timestamp for update
      const timestamp = Timestamp.now();

      // Update the document
      await updateDoc(prRef, {
        quotes: updatedQuotes,
        updatedAt: timestamp
      });

      console.log('Quote updated successfully:', { prId, quoteId: quote.id });
    } catch (error) {
      console.error('Error updating quote:', error instanceof Error ? error.message : String(error));
      throw error;
    }
  },

  /**
   * Adds a quote to a PR
   * @param {string} prId - ID of the PR
   * @param {Quote} quote - Quote data to add
   * @returns {Promise<void>}
   */
  async addQuote(prId: string, quote: Quote): Promise<void> {
    try {
      if (!prId) {
        throw new Error('PR ID is required');
      }
      
      if (!quote || !quote.id) {
        throw new Error('Valid quote with ID is required');
      }

      const db = getFirestore(app);
      if (!db) {
        throw new Error('Firestore instance not available');
      }

      const prRef = doc(db, PR_COLLECTION, prId);
      const prDoc = await getDoc(prRef);
      
      if (!prDoc.exists()) {
        throw new Error('PR not found');
      }

      const pr = prDoc.data() as PRRequest;
      if (pr.status !== PRStatus.IN_QUEUE) {
        throw new Error('Quotes can only be added when PR is in queue');
      }

      // Create a timestamp manually to avoid any undefined issues
      const timestamp = Timestamp.now();

      await updateDoc(prRef, {
        quotes: arrayUnion(quote),
        updatedAt: timestamp,
      });

      console.log('Quote added successfully:', { prId, quoteId: quote.id });
    } catch (error) {
      console.error('Error adding quote:', error instanceof Error ? error.message : String(error));
      throw error;
    }
  },

  /**
   * Fetches organization-specific rules
   * @param {string} organizationId - ID of the organization
   * @param {number} amount - Amount to check against rules
   * @returns {Promise<Rule[]>} Organization rules array
   */
  async getRuleForOrganization(organizationId: string, amount?: number): Promise<Rule[]> {
    try {
      const db = getFirestore(app);
      const rulesRef = collection(db, 'referenceData_rules');
      
      // Convert organization ID to lowercase format
      const normalizedOrgId = organizationId.toLowerCase().replace(/\s+/g, '_');
      
      // Get all rules for the organization
      const q = query(rulesRef, where('organizationId', '==', normalizedOrgId));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        console.warn(`No rules found for organization: ${organizationId} (normalized: ${normalizedOrgId})`);
        return []; // Return empty array to indicate no rules
      }

      // Convert all documents to Rule objects
      const rules: Rule[] = querySnapshot.docs.map(doc => {
        const data = doc.data();
        // Use the default PR_AMOUNT_THRESHOLDS as fallback
        const adminThreshold = PR_AMOUNT_THRESHOLDS.ADMIN_APPROVAL;
        
        return {
          id: doc.id,
          type: data.threshold <= (data.adminThreshold || adminThreshold) ? 'RULE_1' : 'RULE_2', // Set type based on threshold
          number: data.number || '1',
          description: data.description || '',
          threshold: Number(data.threshold) || 0,
          currency: data.currency || 'LSL',
          active: data.active ?? true,
          organization: data.organization || {
            id: normalizedOrgId,
            name: organizationId
          },
          organizationId: data.organizationId || normalizedOrgId,
          approverThresholds: {
            procurement: data.approverThresholds?.procurement || 100000,
            financeAdmin: data.approverThresholds?.financeAdmin || 500000,
            ceo: data.approverThresholds?.ceo || null
          },
          quoteRequirements: {
            aboveThreshold: data.quoteRequirements?.aboveThreshold || 3,
            belowThreshold: {
              approved: data.quoteRequirements?.belowThreshold?.approved || 1,
              default: data.quoteRequirements?.belowThreshold?.default || 1
            }
          },
          createdAt: data.createdAt || new Date().toISOString(),
          updatedAt: data.updatedAt || new Date().toISOString()
        };
      });

      // Sort rules by threshold in ascending order
      rules.sort((a, b) => a.threshold - b.threshold);

      // Log the rules we're returning
      console.log('Returning rules:', {
        organizationId,
        normalizedOrgId,
        rulesCount: rules.length,
        rules: rules.map(r => ({
          id: r.id,
          type: r.type,
          threshold: r.threshold,
          currency: r.currency
        }))
      });

      return rules;
    } catch (error) {
      console.error('Error fetching organization rules:', error instanceof Error ? error.message : String(error));
      throw new Error('Failed to fetch organization rules');
    }
  },
  /**
   * Gets the assigned approver for a PR
   * @param pr PR to get approver for
   * @returns Promise<User | null> User object of the approver, or null if none found or inactive
   */
  async getApproverForPR(pr: PRRequest): Promise<User | null> {
    try {
      // First check if we have an approval workflow with a current approver
      if (pr.approvalWorkflow?.currentApprover) {
        console.log("PR Service: Using currentApprover from approvalWorkflow:", pr.approvalWorkflow.currentApprover);
        const approverId = pr.approvalWorkflow.currentApprover;
        
        // Fetch the approver user
        const db = getFirestore(app);
        const userRef = doc(db, "users", approverId);
        const userSnap = await getDoc(userRef);
        
        if (userSnap.exists()) {
          const user = { id: userSnap.id, ...userSnap.data() } as User;
          if (user.isActive !== false) {
            return user;
          }
        }
      }
      
      // Fall back to legacy approver field if no approvalWorkflow or approver not found
      if (!pr.approver) {
        console.warn("No approver assigned to PR");
        return null;
      }

      console.log("PR Service: Getting assigned approver for PR with data:", {
        id: pr.id,
        prNumber: pr.prNumber,
        approver: pr.approver,
        approvalWorkflow: pr.approvalWorkflow ? 
          `currentApprover: ${pr.approvalWorkflow.currentApprover}` : "Not set"
      });

      const db = getFirestore(app);
      const userRef = doc(db, "users", pr.approver);
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists()) {
        const user = { id: userSnap.id, ...userSnap.data() } as User;
        if (user.isActive !== false) {
          console.log("PR Service: Found assigned approver:", {
            id: user.id,
            name: `${user.firstName || ""} ${user.lastName || ""}`.trim(),
            permissionLevel: user.permissionLevel
          });
          return user;
        } else {
          console.warn(`Assigned approver ${pr.approver} is inactive`);
          return null;
        }
      } else {
        console.warn(`Assigned approver ${pr.approver} not found`);
        return null;
      }
    } catch (error) {
      console.error("Error getting approver for PR:", error instanceof Error ? error.message : String(error));
      return null;
    }
  },
  /**
   * Updates the approver for a PR
   * @param {string} prId - PR ID
   * @param {string} approverId - New approver ID
   * @param {string} notes - Notes about the approver change
   * @returns {Promise<void>}
   */
  async updateApprover(prId: string, approverId: string, notes: string = 'Approver reassigned'): Promise<void> {
    try {
      console.log('Updating approver:', { prId, approverId, notes });
      
      // Get current PR data
      const prRef = doc(getFirestore(app), PR_COLLECTION, prId);
      const prSnap = await getDoc(prRef);
      
      if (!prSnap.exists()) {
        throw new Error(`PR not found: ${prId}`);
      }
      
      const prData = prSnap.data() as PRRequest;
      
      // Update approver and approval workflow
      const updates: Partial<PRRequest> = {
        approver: approverId, // Legacy field, maintained for backward compatibility
        updatedAt: new Date().toISOString(),
        approvalWorkflow: {
          currentApprover: approverId, // Single source of truth
          approvalHistory: [
            ...(prData.approvalWorkflow?.approvalHistory || []),
            {
              approverId,
              timestamp: new Date().toISOString(),
              approved: false,
              notes: notes
            }
          ],
          lastUpdated: new Date().toISOString()
        }
      };
      
      await updateDoc(prRef, updates);
      console.log('Approver updated successfully:', { prId, approverId });
    } catch (error) {
      console.error('Error updating approver:', error instanceof Error ? error.message : String(error));
      throw error;
    }
  }
};