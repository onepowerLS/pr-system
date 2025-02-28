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
  getFirestore, 
  collection, 
  doc, 
  getDoc,
  getDocs,
  query,
  where,
  limit,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  Timestamp,
  DocumentData,
  DocumentSnapshot,
  QuerySnapshot,
  arrayUnion,
  addDoc,
  writeBatch
} from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { db } from '../config/firebase';
import { 
  PRRequest, 
  PRStatus, 
  Quote, 
  LineItem, 
  PRWorkflow, 
  WorkflowStep, 
  ApprovalWorkflow,
  ApprovalHistoryItem,
  PR_AMOUNT_THRESHOLDS 
} from '../types/pr';
import { User } from '../types/user';
import { Rule } from '../types/referenceData';
import { calculateDaysOpen } from '../utils/formatters';
import { StorageService } from './storage';
import { auth } from '../config/firebase';
import { UserRole } from '../types/user';
import { PERMISSION_LEVELS } from '../config/permissions';
import { submitPRNotification } from './notifications/handlers/submitPRNotification';

const PR_COLLECTION = 'purchaseRequests';
const functions = getFunctions();
const sendPRNotification = httpsCallable(functions, 'sendPRNotification');

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
 * Calculates PR metrics
 * @param {PRRequest} pr - Purchase request data
 * @returns {PRRequest} Purchase request data with calculated metrics
 */
const calculatePRMetrics = (pr: PRRequest) => {
  console.log('Calculating metrics for PR:', JSON.stringify({
    id: pr.id,
    isUrgent: pr.isUrgent
  }, null, 2));
  return {
    ...pr,
    metrics: {
      daysOpen: calculateDaysOpen(pr.createdAt),
      daysResubmission: pr.resubmittedAt ? calculateDaysOpen(pr.resubmittedAt) : 0,
      isUrgent: pr.isUrgent, // Sync with top-level isUrgent
      ...(pr.metrics || {})  // Spread existing metrics if they exist
    }
  };
};

/**
 * Purchase Request Service
 */
export const prService = {
  /**
   * Creates a new purchase request
   * @param {Partial<PRRequest>} prData - Purchase request data
   * @returns {Promise<string>} ID of the created purchase request
   */
  async createPR(prData: Partial<PRRequest>): Promise<string> {
    console.log('Creating PR with data:', prData);
    
    try {
      // Validate required fields
      if (!prData.organization) {
        throw new Error('organization is required');
      }
      if (!prData.requestorId) {
        throw new Error('requestorId is required');
      }

      // Generate PR number
      const prNumber = await this.generatePRNumber(prData.organization);
      console.log('Generated PR number:', prNumber);

      // Get current user for audit fields
      const user = auth.currentUser;
      if (!user) {
        throw new Error('No authenticated user');
      }

      // Set initial status and timestamps
      const now = Timestamp.now();
      const serverNow = serverTimestamp();
      
      // Handle approver data 
      if (prData.approver) {
        console.log('PR Creation: Approver information found', {
          approver: prData.approver,
          type: typeof prData.approver
        });
      }
      
      // Set up approval workflow (mirroring PR.approver which is the source of truth)
      const approvalWorkflow = {
        currentApprover: prData.approver || null, // Mirror the PR.approver field
        approvalHistory: [],
        lastUpdated: now.toDate().toISOString()
      };

      const pr = {
        ...prData,
        prNumber,
        status: 'SUBMITTED' as PRStatus,
        createdAt: serverNow,
        updatedAt: serverNow,
        requestor: {
          firstName: prData.requestor?.name?.split(' ')[0] || prData.requestor?.firstName || '',
          lastName: prData.requestor?.name?.split(' ')[1] || prData.requestor?.lastName || '',
          email: prData.requestor?.email || prData.email || '',
          department: prData.requestor?.department || prData.department || ''
        },
        createdBy: {
          id: user.uid,
          name: user.displayName || '',
          email: user.email || ''
        },
        updatedBy: {
          id: user.uid,
          name: user.displayName || '',
          email: user.email || ''
        },
        statusHistory: [{
          status: 'SUBMITTED',
          timestamp: now, // Use regular Timestamp for array
          updatedBy: {
            id: user.uid,
            name: user.displayName || '',
            email: user.email || ''
          }
        }],
        approvalWorkflow,
      };

      // Create PR document
      const docRef = await addDoc(collection(db, PR_COLLECTION), pr);
      const prWithId = { ...pr, id: docRef.id };
      console.log('Created PR with ID:', docRef.id);

      // Send notification for PR submission
      try {
        await submitPRNotification.createNotification(prWithId, prNumber);
      } catch (error) {
        console.error('Error sending PR submission notification:', error);
        // Don't throw here - we want the PR to be created even if notification fails
      }

      return docRef.id;
    } catch (error) {
      console.error('Error creating PR:', error);
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

      // Query for all PRs for this organization and filter client-side
      const q = query(
        collection(db, PR_COLLECTION),
        where('organization', '==', organization)
      );

      const querySnapshot = await getDocs(q);
      
      // Filter for current month client-side
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      
      const thisMonthPRs = querySnapshot.docs.filter(doc => {
        const data = doc.data();
        if (!data.createdAt) return false;
        
        // Handle both Firestore Timestamp and Date objects
        const createdAt = data.createdAt instanceof Date 
          ? data.createdAt 
          : data.createdAt.toDate?.() || new Date(data.createdAt);
          
        return createdAt >= startOfMonth && createdAt <= endOfMonth;
      });

      // Find the highest number used this month
      let maxNumber = 0;
      thisMonthPRs.forEach(doc => {
        const prNumber = doc.data().prNumber;
        if (prNumber && prNumber.startsWith(`PR-${yearMonth}-`)) {
          const num = parseInt(prNumber.split('-')[2]);
          if (!isNaN(num) && num > maxNumber) {
            maxNumber = num;
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
        collection(db, PR_COLLECTION),
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
      const user = auth.currentUser;
      if (!user) {
        throw new Error('No authenticated user');
      }

      // Create PR document
      const pr = {
        ...prData,
        prNumber,
        status: PRStatus.DRAFT,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        submittedAt: null,
        submittedBy: user.uid, // Use Firebase UID
        requestorId: user.uid, // Use Firebase UID
        approver: prData.approver || null, // Use approver field as single source of truth
        comments: [],
        history: [],
        attachments: [],
        metrics: {
          daysOpen: 0,
          isUrgent: prData.isUrgent || false
        },
        // Initialize approval workflow structure
        approvalWorkflow: {
          currentApprover: prData.approver || null, // Mirror the PR.approver field
          approvalHistory: [],
          lastUpdated: new Date().toISOString()
        }
      };

      // Add to history
      pr.history.push({
        action: 'CREATED',
        timestamp: new Date().toISOString(),
        user: { id: user.uid, name: prData.requestor } as User,
        comment: 'Purchase request created'
      });

      // Create document
      const docRef = await addDoc(collection(db, PR_COLLECTION), pr);
      console.log('PR created with ID:', JSON.stringify(docRef.id, null, 2));

      // Send notification
      try {
        await sendPRNotification({
          type: 'PR_CREATED',
          prId: docRef.id,
          userId: user.uid,
          prNumber
        });
      } catch (error) {
        console.error('Failed to send PR creation notification:', JSON.stringify(error, null, 2));
        // Don't throw error, as PR is already created
      }

      // Log notification in Firestore
      await notificationService.logNotification(
        'PR_SUBMITTED',
        docRef.id,
        ['procurement@1pwrafrica.com', prData.requestorEmail!],
        'pending'
      );

      // Handle status change notification
      await notificationService.handleStatusChange(
        docRef.id,
        '',  // No previous status for new PR
        PRStatus.SUBMITTED,
        {
          id: prData.requestorId!,
          email: prData.requestorEmail!,
          name: prData.requestor?.name || 'Unknown',
          organization: prData.organization!
        } as User
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
   * @param {Partial<PRRequest>} updates - Updated purchase request data
   * @returns {Promise<void>}
   */
  async updatePR(prId: string, updates: Partial<PRRequest>): Promise<void> {
    try {
      console.log('Updating PR:', JSON.stringify({ prId, updates }, null, 2));
      
      const prRef = doc(db, PR_COLLECTION, prId);
      
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
            notes: updates.notes || 'Approver reassigned'
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
   * @param {Partial<PRRequest>} updates - Updated purchase request data
   * @returns {Promise<void>}
   */
  async updatePRs(prIds: string[], updates: Partial<PRRequest>): Promise<void> {
    try {
      console.log('Updating PRs:', JSON.stringify({ prIds, updates }, null, 2));
      
      const batch = writeBatch(db);
      
      // Get all PR refs and current data
      const prRefs = await Promise.all(prIds.map(async (prId) => {
        const ref = doc(db, PR_COLLECTION, prId);
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
      const user = auth.currentUser;
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Get user details and permission level
      const userDoc = await getDoc(doc(db, 'users', userId));
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
            collection(db, PR_COLLECTION),
            where('organization', '==', organization),
            where('createdBy.id', '==', userId)
          )),
          // Query for PRs where user is in approvers array
          getDocs(query(
            collection(db, PR_COLLECTION),
            where('organization', '==', organization),
            where('approvers', 'array-contains', userId)
          )),
          // Query for PRs where user is the workflow approver
          getDocs(query(
            collection(db, PR_COLLECTION),
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
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
      }

      // If not filtering to user, show all PRs in the organization
      console.log('Showing all PRs');
      const q = query(
        collection(db, PR_COLLECTION),
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
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
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
      
      const q = query(collection(db, PR_COLLECTION), ...conditions);
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
        return (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0);
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
   * @param {User} updatedBy - User who updated the status
   * @returns {Promise<void>}
   */
  async updatePRStatus(
    prId: string, 
    newStatus: PRStatus,
    notes?: string,
    user?: User
  ): Promise<void> {
    try {
      const prRef = doc(db, PR_COLLECTION, prId);
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
      
      // Send notification
      await notificationService.createNotification(
        {
          id: prId,
          ...updatedPrData, // Use updated data here
          prNumber: updatedPrData.prNumber
        },
        oldStatus,
        newStatus,
        user,
        notes || ''
      );
    } catch (error) {
      console.error('Error updating PR status:', error);
      throw new Error(`Failed to update PR status: ${error.message}`);
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
      const pr = await this.getPR(prId);
      if (!pr) return;

      // Delete all attachments
      if (pr.lineItems) {
        for (const lineItem of pr.lineItems) {
          if (lineItem.attachments?.length > 0) {
            await Promise.all(lineItem.attachments.map(async (file: { url: string }) => {
              if (typeof file.url === 'string') {
                await StorageService.deleteFile(file.url);
              } else {
                console.error('Invalid file URL:', JSON.stringify(file.url, null, 2));
              }
            }));
          }
        }
      }

      // Delete PR document
      await deleteDoc(doc(db, PR_COLLECTION, prId));
    } catch (error) {
      console.error('Error deleting PR:', JSON.stringify(error, null, 2));
      throw error;
    } finally {
      // Added finally block to ensure proper closure of try-catch block
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
      let prRef = doc(db, PR_COLLECTION, prId);
      let prDoc = await getDoc(prRef);

      if (!prDoc.exists()) {
        // If not found by ID, try to find by PR number
        const q = query(
          collection(db, PR_COLLECTION),
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
        workflowHistory: prDoc.data().workflowHistory || [],
        statusHistory: prDoc.data().statusHistory || []
      } as PRRequest;

      // Initialize approver if missing
      if (!prData.approver) {
        console.log('PR Service: No approver assigned for PR:', prId);
        console.log('PR Service: Checking for approver - PR data:', {
          approver: prData.approver || 'Not set',
          approvalWorkflow: prData.approvalWorkflow ? 
            `currentApprover: ${prData.approvalWorkflow.currentApprover}` : 'Not set'
        });
        
        // Get appropriate approver based on rules
        const approver = await this.getApproverForPR(prData);
        console.log('PR Service: Selected approver:', approver ? {
          id: approver.id,
          name: `${approver.firstName || ''} ${approver.lastName || ''}`.trim(),
          permissionLevel: approver.permissionLevel,
          organization: approver.organization
        } : 'No approver found');
        
        if (approver) {
          prData.approver = approver.id;
          // Update the PR document with the approver
          await updateDoc(prRef, {
            approver: approver.id
          });
        } else {
          console.warn('PR Service: No eligible approver found for PR:', prId);
        }
      }

      // Convert timestamps
      prData = convertTimestamps(prData) as PRRequest;

      // Calculate metrics
      prData = calculatePRMetrics(prData);

      if (prData) {
        // Fetch and populate requestor details
        try {
          const userDoc = await getDoc(doc(db, 'users', prData.requestorId));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            prData.requestor = {
              id: prData.requestorId,
              email: userData.email,
              firstName: userData.firstName,
              lastName: userData.lastName,
              role: userData.role,
              organization: userData.organization,
              isActive: userData.isActive,
              permissionLevel: userData.permissionLevel
            };
          } else {
            console.error('Requestor not found in users collection:', prData.requestorId);
          }
        } catch (error) {
          console.error('Error fetching requestor details:', error);
        }

        // Initialize workflow history if it doesn't exist
        if (!prData.workflowHistory) {
          prData.workflowHistory = [];
          
          // If we have status history, convert it to workflow history
          if (prData.statusHistory && prData.statusHistory.length > 0) {
            prData.workflowHistory = prData.statusHistory.map(sh => ({
              step: sh.status,
              timestamp: sh.timestamp,
              notes: 'Status changed to ' + PRStatus[sh.status],
              user: sh.updatedBy
            }));

            // Update the PR with the new workflow history
            await updateDoc(doc(db, PR_COLLECTION, prId), {
              workflowHistory: prData.workflowHistory
            });
          }
        }

        return prData;
      }

      return null;
    } catch (error) {
      console.error('Error getting PR:', JSON.stringify(error, null, 2));
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
      const prRef = doc(db, PR_COLLECTION, prId);
      const prDoc = await getDoc(prRef);
      
      if (!prDoc.exists()) {
        throw new Error('PR not found');
      }

      const pr = prDoc.data() as PRRequest;
      if (pr.status !== PRStatus.IN_QUEUE) {
        throw new Error('Quotes can only be added when PR is in queue');
      }

      await updateDoc(prRef, {
        quotes: arrayUnion(quote),
        updatedAt: Timestamp.now(),
      });

      console.log('Quote added successfully:', { prId, quoteId: quote.id });
    } catch (error) {
      console.error('Error adding quote:', error);
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
      const prRef = doc(db, PR_COLLECTION, prId);
      const prDoc = await getDoc(prRef);
      
      if (!prDoc.exists()) {
        throw new Error('PR not found');
      }

      const pr = prDoc.data() as PRRequest;
      if (pr.status !== PRStatus.IN_QUEUE) {
        throw new Error('Quotes can only be modified when PR is in queue');
      }

      const quotes = pr.quotes || [];
      const updatedQuotes = quotes.map(q => q.id === quote.id ? quote : q);

      await updateDoc(prRef, {
        quotes: updatedQuotes,
        updatedAt: Timestamp.now(),
      });

      console.log('Quote updated successfully:', { prId, quoteId: quote.id });
    } catch (error) {
      console.error('Error updating quote:', error);
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
      const prRef = doc(db, PR_COLLECTION, prId);
      const prDoc = await getDoc(prRef);
      
      if (!prDoc.exists()) {
        throw new Error('PR not found');
      }

      const pr = prDoc.data() as PRRequest;
      if (pr.status !== PRStatus.IN_QUEUE) {
        throw new Error('Quotes can only be deleted when PR is in queue');
      }

      const quotes = pr.quotes || [];
      const updatedQuotes = quotes.filter(q => q.id !== quoteId);

      await updateDoc(prRef, {
        quotes: updatedQuotes,
        updatedAt: Timestamp.now(),
      });

      console.log('Quote deleted successfully:', { prId, quoteId });
    } catch (error) {
      console.error('Error deleting quote:', error);
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
      const db = getFirestore();
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
      const rules = querySnapshot.docs.map(doc => {
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
        } as Rule;
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
      console.error('Error fetching organization rules:', error);
      throw new Error('Failed to fetch organization rules');
    }
  },

  /**
   * Gets the appropriate approver for a PR based on rules
   * @param pr PR to get approver for
   * @returns Promise<User | null> User object of the approver, or null if none found
   */
  async getApproverForPR(pr: PRRequest): Promise<User | null> {
    try {
      // Normalize organization name for consistent matching
      const organizationId = pr.organization.toLowerCase().replace(/[^a-z0-9]/g, '_');
      
      // Validate the PR data
      if (!organizationId) {
        console.warn('No organization provided for PR');
        return null;
      }

      console.log('PR Service: Getting approver for PR with data:', {
        id: pr.id,
        prNumber: pr.prNumber,
        approver: pr.approver || 'Not set',
        approvalWorkflow: pr.approvalWorkflow ? 
          `currentApprover: ${pr.approvalWorkflow.currentApprover}` : 'Not set'
      });

      // Check if there's already a manually assigned approver in the approver field
      if (pr.approver) {
        console.log('PR Service: Using manually assigned approver:', pr.approver);
        
        // If we have a manually assigned approver, return that user
        const db = getFirestore();
        const userRef = doc(db, 'users', pr.approver);
        const userSnap = await getDoc(userRef);
        
        if (userSnap.exists()) {
          const user = { id: userSnap.id, ...userSnap.data() } as User;
          // Only use the approver if they're active
          if (user.isActive !== false) {
            return user;
          } else {
            console.warn(`Manually assigned approver ${pr.approver} is inactive`);
          }
        } else {
          console.warn(`Manually assigned approver ${pr.approver} not found`);
        }
      }

      const db = getFirestore();
      
      // Get organization rules to determine approval thresholds
      const rules = await this.getRuleForOrganization(organizationId, pr.estimatedAmount);
      
      if (!rules || rules.length === 0) {
        console.warn(`No rules found for organization: ${organizationId}`);
        
        // If no rules but have a manually assigned approver, return that
        if (pr.approver) {
          const userRef = doc(db, 'users', pr.approver);
          const userSnap = await getDoc(userRef);
          if (userSnap.exists()) {
            return { id: userSnap.id, ...userSnap.data() } as User;
          }
        }
        
        // Otherwise return null
        return null;
      }

      // Determine if a higher permission level approver is needed based on rules
      const needsHigherPermission = rules.some(rule => {
        if (!rule.conditions) return false;
        return rule.conditions.some(condition => {
          // Normalize currency for comparison
          const baseAmount = pr.currency === condition.currency 
            ? pr.estimatedAmount 
            : convertAmount(pr.estimatedAmount, pr.currency, condition.currency);
          
          // Check if PR amount is above threshold
          if (baseAmount > condition.amount) {
            return true;
          }
          return false;
        });
      });
      
      console.log('PR Service: Permission level check:', {
        needsHigherPermission,
        rules: rules.length,
        estimatedAmount: pr.estimatedAmount,
        currency: pr.currency
      });
      
      // Query for users that can approve based on permission level
      const usersQuery = query(
        collection(db, 'users'),
        where('isActive', '==', true),
        where('permissionLevel', '==', needsHigherPermission ? 2 : 6),
        where('organization', '==', organizationId)
      );
      
      const usersSnap = await getDocs(usersQuery);
      if (usersSnap.empty) {
        console.warn(`No active users with required permission level (${needsHigherPermission ? 2 : 6}) found for ${organizationId}`);
        return null;
      }

      // Get eligible approvers
      const eligibleApprovers: User[] = [];
      usersSnap.forEach(doc => {
        const user = { id: doc.id, ...doc.data() } as User;
        if (user.isActive !== false) {
          eligibleApprovers.push(user);
        }
      });
      
      if (eligibleApprovers.length === 0) {
        console.warn('No eligible approvers found');
        return null;
      }
      
      // Select a random approver from the list (simplified approach)
      const randomIndex = Math.floor(Math.random() * eligibleApprovers.length);
      const selectedApprover = eligibleApprovers[randomIndex];
      
      console.log('PR Service: Selected approver from eligible list:', {
        id: selectedApprover.id,
        name: `${selectedApprover.firstName || ''} ${selectedApprover.lastName || ''}`.trim(),
        permissionLevel: selectedApprover.permissionLevel
      });
      
      return selectedApprover;
    } catch (error) {
      console.error('Error getting approver for PR:', error);
      return null;
    }
  }
};
