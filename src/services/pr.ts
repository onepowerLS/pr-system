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
 * - PRs over $1,000 require admin approval
 * - PRs over $5,000 require multiple quotes
 * - PRs over $50,000 require finance approval
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
  collection,
  doc,
  addDoc,
  updateDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  Timestamp,
  deleteDoc,
  writeBatch
} from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { db } from '../config/firebase';
import { PRRequest, PRStatus, User } from '../types/pr';
import { notificationService } from './notification';
import { calculateDaysOpen } from '../utils/formatters';
import { deleteFile, moveToPermanentStorage } from './storage';

const PR_COLLECTION = 'purchaseRequests';
const functions = getFunctions();
const sendPRNotification = httpsCallable(functions, 'sendPRNotification');

/**
 * Converts Firestore timestamp to ISO string for Redux
 * @param {any} data - Data to convert
 * @returns {any} Converted data
 */
const convertTimestamps = (data: any): any => {
  if (!data) return data;
  
  if (data instanceof Timestamp) {
    return data.toDate().toISOString();
  }
  
  if (Array.isArray(data)) {
    return data.map(item => convertTimestamps(item));
  }
  
  if (typeof data === 'object') {
    const result: any = {};
    for (const key in data) {
      result[key] = convertTimestamps(data[key]);
    }
    return result;
  }
  
  return data;
};

/**
 * Calculates PR metrics
 * @param {PRRequest} pr - Purchase request data
 * @returns {PRRequest} Purchase request data with calculated metrics
 */
const calculatePRMetrics = (pr: PRRequest) => {
  console.log('Calculating metrics for PR:', {
    id: pr.id,
    isUrgent: pr.isUrgent
  });
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
    try {
      console.log('Creating PR with data:', prData);
      const prNumber = await this.generatePRNumber(prData.organization!);
      
      // Create PR document
      const prRef = await addDoc(collection(db, PR_COLLECTION), {
        ...prData,
        prNumber,
        status: PRStatus.SUBMITTED,  // Always SUBMITTED
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      });

      // Move files from temp storage to permanent storage and update URLs
      if (prData.lineItems) {
        const updatedLineItems = await Promise.all(
          prData.lineItems.map(async (lineItem) => {
            if (lineItem.attachments?.length > 0) {
              const updatedAttachments = await Promise.all(
                lineItem.attachments.map(async (attachment) => {
                  // Move file from temp to permanent storage
                  const permanentPath = await moveToPermanentStorage(
                    attachment.path, // Use path instead of url
                    prNumber,        // PR number for folder structure
                    attachment.name  // Original filename
                  );
                  
                  // Return updated attachment with new URL
                  return {
                    ...attachment,
                    url: permanentPath
                  };
                })
              );
              
              return {
                ...lineItem,
                attachments: updatedAttachments
              };
            }
            return lineItem;
          })
        );

        // Update PR document with new file URLs
        await updateDoc(doc(db, PR_COLLECTION, prRef.id), {
          lineItems: updatedLineItems
        });
      }

      // Send email notification using Cloud Function
      try {
        console.log('Line items before notification:', prData.lineItems);
        const notificationData = {
          prNumber,
          department: prData.department,
          requestorName: prData.requestor?.name,
          requestorEmail: prData.requestorEmail,
          description: prData.description,
          requiredDate: prData.requiredDate,
          isUrgent: prData.isUrgent,
          items: prData.lineItems?.map(item => {
            console.log('Processing line item attachments:', item.attachments);
            return {
              description: item.description,
              quantity: item.quantity,
              uom: item.uom,
              notes: item.notes,
              attachments: item.attachments?.map(att => ({
                name: att.name,
                size: att.size,
                type: att.type,
                url: att.url // Include the URL in notification data
              })) || []
            };
          })
        };

        console.log('Sending PR notification with data:', notificationData);
        const result = await sendPRNotification(notificationData);
        console.log('PR notification sent:', result);
      } catch (notificationError) {
        console.error('Error sending PR notification:', notificationError);
        // Don't throw here - we want the PR to be created even if notification fails
      }

      // Log notification in Firestore
      await notificationService.logNotification(
        'PR_SUBMITTED',
        prRef.id,
        ['procurement@1pwrafrica.com', prData.requestorEmail!],
        'pending'
      );

      // Handle status change notification
      await notificationService.handleStatusChange(
        prRef.id,
        '',  // No previous status for new PR
        PRStatus.SUBMITTED,
        {
          id: prData.requestorId!,
          email: prData.requestorEmail!,
          name: prData.requestor?.name || 'Unknown',
          organization: prData.organization!
        } as User
      );

      return prRef.id;
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
  async generatePRNumber(organization: string): Promise<string> {
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
        const createdAt = data.createdAt?.toDate();
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

      // Use the next number after the highest found
      const nextNumber = maxNumber + 1;
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
        console.error('PR number collision detected:', prNumber);
        // If there's a collision, try the next number recursively
        return this.generatePRNumber(organization);
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
      console.log('Creating PR with data:', prData);
      
      // Ensure required fields are present
      if (!prData.requestorId) {
        throw new Error('requestorId is required');
      }
      if (!prData.organization) {
        throw new Error('organization is required');
      }

      // Generate PR number
      const prNumber = await this.generatePRNumber(prData.organization);

      const finalPRData = {
        ...prData,
        status: PRStatus.SUBMITTED,  // Always SUBMITTED
        createdAt: Timestamp.fromDate(new Date()),
        updatedAt: Timestamp.fromDate(new Date()),
        submittedBy: prData.requestorId,
        requestorId: prData.requestorId,
        prNumber: prNumber,  // Add PR number
        isUrgent: prData.isUrgent ?? false  // Ensure isUrgent is always a boolean
      };

      console.log('Final PR data:', finalPRData);

      const docRef = await addDoc(collection(db, PR_COLLECTION), finalPRData);

      // Create status change notification
      await notificationService.handleStatusChange(
        docRef.id,
        '',
        PRStatus.SUBMITTED,
        { id: prData.requestorId, name: prData.requestor } as User
      );

      return docRef.id;
    } catch (error) {
      console.error('Error creating PR:', error);
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
      console.log('Updating PR:', { prId, updates });
      
      const prRef = doc(db, PR_COLLECTION, prId);
      
      // Get current PR data
      const prSnapshot = await getDoc(prRef);
      if (!prSnapshot.exists()) {
        throw new Error('PR not found');
      }
      
      const prData = prSnapshot.data();
      
      // Merge updates with current data
      const finalUpdates = {
        ...updates,
        updatedAt: Timestamp.fromDate(new Date()),
        isUrgent: updates.isUrgent ?? prData.isUrgent ?? false  // Keep existing isUrgent or set to false
      };
      
      await updateDoc(prRef, finalUpdates);
    } catch (error) {
      console.error('Error updating PR:', error);
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
      console.log('Updating PRs:', { prIds, updates });
      
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
      
      console.log('Successfully updated PRs:', prIds);
    } catch (error) {
      console.error('Error updating PRs:', error);
      throw error;
    }
  },

  /**
   * Retrieves purchase requests for a given user
   * @param {string} userId - ID of the user
   * @param {string} organization - Organization name
   * @returns {Promise<PRRequest[]>} List of purchase requests for the user
   */
  async getUserPRs(userId: string, organization: string): Promise<PRRequest[]> {
    try {
      if (!userId) {
        console.error('getUserPRs: No user ID provided');
        return [];
      }

      console.log('Getting PRs for user:', { userId, organization });
      
      const q = query(
        collection(db, PR_COLLECTION),
        where('organization', '==', organization),
        where('requestorId', '==', userId)
      );

      const querySnapshot = await getDocs(q);
      console.log('Query results:', {
        count: querySnapshot.size,
        docs: querySnapshot.docs.map(doc => ({
          id: doc.id,
          organization: doc.data().organization,
          requestorId: doc.data().requestorId,
          status: doc.data().status,
          isUrgent: doc.data().isUrgent,
          metrics: doc.data().metrics
        }))
      });

      const prs = querySnapshot.docs.map(doc => {
        const data = doc.data();
        
        // Get urgency from both top-level and metrics
        const isUrgent = data.isUrgent === true || data.metrics?.isUrgent === true;
        
        // Process the data
        const processedData = {
          ...data,
          id: doc.id,
          isUrgent // Use combined urgency value
        };
        
        const pr = calculatePRMetrics(convertTimestamps(processedData) as PRRequest);
        
        console.log('Processing PR:', {
          id: pr.id,
          prNumber: pr.prNumber,
          status: pr.status,
          isUrgent: pr.isUrgent,
          createdAt: pr.createdAt,
          metrics: pr.metrics
        });
        
        return pr;
      });
      
      // Sort in memory instead of using orderBy
      const sortedPrs = prs.sort((a, b) => {
        // First sort by urgency
        if (a.isUrgent !== b.isUrgent) {
          return a.isUrgent ? -1 : 1;
        }
        // Then by creation date (newest first)
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
      
      console.log('Retrieved PRs:', {
        count: sortedPrs.length,
        prs: sortedPrs.map(pr => ({
          id: pr.id,
          prNumber: pr.prNumber,
          status: pr.status,
          isUrgent: pr.isUrgent,
          createdAt: pr.createdAt,
          metrics: pr.metrics
        }))
      });
      
      return sortedPrs;
    } catch (error) {
      console.error('Error getting user PRs:', error);
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
      console.log('Getting pending approvals for:', approverId);

      let q = query(
        collection(db, PR_COLLECTION),
        where('approvers', 'array-contains', approverId)
      );

      if (organization) {
        q = query(q, where('organization', '==', organization));
      }

      const querySnapshot = await getDocs(q);
      const prs = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as PRRequest[];

      // Separate urgent and non-urgent PRs
      const urgentPRs = prs.filter(pr => pr.isUrgent);
      const nonUrgentPRs = prs.filter(pr => !pr.isUrgent);

      // Sort each group by creation date (oldest first)
      const sortByDate = (a: PRRequest, b: PRRequest) => {
        const dateA = new Date(a.createdAt);
        const dateB = new Date(b.createdAt);
        return dateA.getTime() - dateB.getTime();
      };

      urgentPRs.sort(sortByDate);
      nonUrgentPRs.sort(sortByDate);

      // Combine the groups with urgent PRs first
      const sortedPRs = [...urgentPRs, ...nonUrgentPRs];

      console.log('Sorted pending approvals:', {
        total: sortedPRs.length,
        urgent: urgentPRs.length,
        nonUrgent: nonUrgentPRs.length
      });

      return sortedPRs.map(pr => calculatePRMetrics(pr));
    } catch (error) {
      console.error('Error getting pending approvals:', error);
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
  async updateStatus(prId: string, status: PRStatus, updatedBy: User): Promise<void> {
    try {
      console.log('Updating PR status:', { prId, status, updatedBy });
      
      const prRef = doc(db, PR_COLLECTION, prId);
      
      // Get the current PR data
      const prSnapshot = await getDoc(prRef);
      if (!prSnapshot.exists()) {
        throw new Error('PR not found');
      }
      
      const prData = prSnapshot.data();
      const oldStatus = prData.status;
      
      // Update the PR status
      await updateDoc(prRef, {
        status,
        updatedAt: Timestamp.fromDate(new Date()),
        isUrgent: prData.isUrgent ?? false  // Ensure isUrgent is always a boolean
      });

      // Create status change notification
      await notificationService.handleStatusChange(
        prId,
        oldStatus,
        status,
        updatedBy
      );
    } catch (error) {
      console.error('Error updating PR status:', error);
      throw error;
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
                await deleteFile(file.url);
              } else {
                console.error('Invalid file URL:', file.url);
              }
            }));
          }
        }
      }

      // Delete PR document
      await deleteDoc(doc(db, PR_COLLECTION, prId));
    } catch (error) {
      console.error('Error deleting PR:', error);
      throw error;
    }
  },

  /**
   * Retrieves a purchase request by ID or PR number
   * @param {string} prId - ID or PR number of the purchase request
   * @returns {Promise<PRRequest | null>} Purchase request data or null if not found
   */
  getPR: async (prId: string): Promise<PRRequest | null> => {
    try {
      // First try to get PR by document ID
      const docRef = doc(db, PR_COLLECTION, prId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          ...data,
          createdAt: convertTimestamps(data.createdAt),
          updatedAt: convertTimestamps(data.updatedAt),
          resubmittedAt: convertTimestamps(data.resubmittedAt)
        } as PRRequest;
      }

      // If not found, try to get PR by PR number
      const q = query(
        collection(db, PR_COLLECTION),
        where('prNumber', '==', prId)
      );
      
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        const doc = querySnapshot.docs[0];
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: convertTimestamps(data.createdAt),
          updatedAt: convertTimestamps(data.updatedAt),
          resubmittedAt: convertTimestamps(data.resubmittedAt)
        } as PRRequest;
      }

      return null;
    } catch (error) {
      console.error('Error getting PR:', error);
      throw error;
    }
  }
};
