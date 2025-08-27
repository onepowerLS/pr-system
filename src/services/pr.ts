import { 
  doc, 
  getDoc, 
  getDocs, 
  updateDoc, 
  collection, 
  query, 
  where,
  addDoc,
  deleteDoc, 
  serverTimestamp, 
  Timestamp,
  DocumentData, 
  Query, 
  QueryConstraint,
  orderBy, 
  limit,
  FieldValue,
  setDoc,
} from 'firebase/firestore';
import { getFirestore } from 'firebase/firestore'; 
import { app, auth } from '@/config/firebase'; 
import { logger } from '@/utils/logger';
import { PRRequest, PRStatus, UserReference, HistoryItem, LineItem, ApprovalWorkflow, StatusHistoryItem, ApprovalHistoryItem } from '@/types/pr'; 
import { User } from '@/types/user'; 
import { mapFirebaseUserToUserReference } from '@/utils/userMapper';
import { Notification } from '@/types/notification'; 

const PR_COLLECTION = 'purchaseRequests';
const COUNTER_COLLECTION = 'counters';
const APPROVAL_RULES_COLLECTION = 'approvalRules'; 
const NOTIFICATION_COLLECTION = 'notifications'; 
const db = getFirestore(app);

interface ApprovalRule {
  id: string;
  organization: string;
  minAmount: number;
  approverLevel: number; 
  // Add other relevant fields from your DB structure
}

interface PRUpdateData {
  [key: string]: any; 
  history?: HistoryItem[]; 
  statusHistory?: StatusHistoryItem[]; 
  status?: PRStatus;
  approvalWorkflow?: Partial<ApprovalWorkflow>;
  updatedAt?: FieldValue; 
}

interface PRCreateData extends Omit<PRRequest, 'id' | 'prNumber' | 'createdAt' | 'updatedAt' | 'history' | 'totalAmount'> {
  requestor: UserReference;
  vehicle?: string; // Make optional
  preferredVendor?: string; // Make optional
  // Ensure other required fields are present
}

/**
 * Function to safely convert Firestore Timestamps or existing ISO strings to ISO strings.
 * Returns undefined if the input is invalid or missing.
 */
function safeTimestampToISO(timestamp: Timestamp | string | undefined | null): string | undefined {
  if (timestamp instanceof Timestamp) {
    try {
      return timestamp.toDate().toISOString();
    } catch (e) {
       logger.error("Failed to convert Firestore Timestamp to Date:", e);
       return undefined;
    }
  }
  if (typeof timestamp === 'string') {
    // Basic validation if it's already an ISO string
    try {
      // Attempt to parse; Date.parse returns NaN for invalid strings
      if (!isNaN(Date.parse(timestamp))) {
        // Check if it roughly looks like an ISO string to avoid converting random strings
        if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|([+-]\d{2}:\d{2}))$/.test(timestamp)) {
            return timestamp;
        }
      }
    } catch(e) {
       logger.error("Failed during string timestamp parsing/validation:", e);
       return undefined;
    }
  }
  // Return undefined for null, undefined, or invalid/non-ISO strings
  return undefined;
}

// Renamed and corrected History Item creation for status changes
function createStatusHistoryItem(
  status: PRStatus,
  user: UserReference,
  notes?: string
): Omit<StatusHistoryItem, 'id'> { 
  return {
    status, 
    timestamp: new Date().toISOString(), 
    user: user, 
    notes: notes || `Status changed to ${status}`,
  };
}

/**
 * Fetches a single Purchase Request by its ID.
 * @param prId - The ID of the PR to fetch.
 * @returns A promise resolving to the PRRequest object or null if not found.
 */
export async function getPR(prId: string): Promise<PRRequest | null> {
  logger.info(`Fetching PR with ID: ${prId}`);
  if (!prId) {
    logger.warn('getPR called with no prId.');
    return null;
  }

  try {
    const prDocRef = doc(db, PR_COLLECTION, prId);
    const docSnap = await getDoc(prDocRef);

    if (!docSnap.exists()) {
      logger.warn(`PR with ID ${prId} not found.`);
      return null;
    }

    const data = docSnap.data();
    const pr: PRRequest = {
      id: docSnap.id,
      prNumber: data.prNumber || `TEMP-${docSnap.id.substring(0,6)}`,
      organization: data.organization,
      department: data.department,
      projectCategory: data.projectCategory,
      site: data.site,
      description: data.description,
      status: data.status as PRStatus,
      expenseType: data.expenseType,
      estimatedAmount: data.estimatedAmount || 0,
      currency: data.currency,
      totalAmount: data.totalAmount || 0,
      requestor: data.requestor as UserReference,
      requestorId: data.requestorId,
      requestorEmail: data.requestorEmail,
      submittedBy: data.submittedBy,
      approver: data.approver, 
      requiredDate: safeTimestampToISO(data.requiredDate) || '', 
      createdAt: safeTimestampToISO(data.createdAt) || new Date().toISOString(),
      updatedAt: safeTimestampToISO(data.updatedAt) || new Date().toISOString(),
      lineItems: (data.lineItems || []).map((item: any): LineItem => ({ ...item })),
      quotes: data.quotes || [],
      attachments: data.attachments || [],
      history: (data.history || []).map((item: any): HistoryItem => ({
          ...item,
          timestamp: safeTimestampToISO(item.timestamp) || new Date().toISOString(), 
      })),
      approvalWorkflow: { 
          ...data.approvalWorkflow,
          lastUpdated: safeTimestampToISO(data.approvalWorkflow?.lastUpdated),
          approvalHistory: (data.approvalWorkflow?.approvalHistory || []).map((item: any) => ({
              ...item,
              timestamp: safeTimestampToISO(item.timestamp),
          })),
      },
      statusHistory: (data.statusHistory || []).map((item: any): StatusHistoryItem => ({
          ...item,
          timestamp: safeTimestampToISO(item.timestamp),
      })),
      isUrgent: data.isUrgent || false,
      metrics: data.metrics || undefined, 
    };
    logger.info(`Successfully fetched PR with ID: ${prId}`);
    return pr;

  } catch (error) {
    logger.error(`Failed to fetch PR with ID ${prId}:`, error);
    throw new Error(`Failed to fetch purchase request: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Updates the status of a PR and adds a status history record.
 * @param prId - The ID of the PR to update.
 * @param status - The new status.
 * @param notes - Optional notes for the history record.
 * @param user - The user performing the action.
 * @returns A promise that resolves when the update is complete.
 */
export async function updatePRStatus(
  prId: string, 
  status: PRStatus, 
  notes?: string, 
  user?: UserReference 
): Promise<void> {
    logger.info(`Updating status for PR ${prId} to ${status} by user ${user?.id || 'System'}`);
    if (!prId || !status || !user) {
        const missing = [!prId && 'prId', !status && 'status', !user && 'user'].filter(Boolean).join(', ');
        logger.error(`updatePRStatus called with missing arguments: ${missing}`);
        throw new Error(`Missing required arguments for status update: ${missing}`);
    }

    try {
        const prDocRef = doc(db, PR_COLLECTION, prId);
        
        // Fetch current PR to get existing status history
        const currentPRSnap = await getDoc(prDocRef);
        if (!currentPRSnap.exists()) {
            throw new Error(`PR with ID ${prId} not found for status update.`);
        }
        const currentData = currentPRSnap.data();
        // Use statusHistory array
        const currentStatusHistory: StatusHistoryItem[] = currentData.statusHistory || []; 

        // Create new status history item using the renamed function
        const statusHistoryEntry = createStatusHistoryItem(status, user, notes);

        // Prepare update data
        const updateData: PRUpdateData = {
            status: status,
            // Append to statusHistory
            statusHistory: [...currentStatusHistory, statusHistoryEntry], 
            updatedAt: serverTimestamp(), 
        };
        
        // If status indicates final approval or rejection, potentially update workflow
        if (status === PRStatus.APPROVED || status === PRStatus.REJECTED) {
           // Add logic here if workflow state needs specific updates on final states
           // e.g., update approvalWorkflow.currentApprover to null or set a final timestamp
        }

        await updateDoc(prDocRef, updateData);
        logger.info(`Successfully updated status for PR ${prId} to ${status}`);
        
        // Add notification creation logic here if needed upon status change
        // Example: await createNotificationForStatusChange(prId, status, user, currentData);

    } catch (error) {
        logger.error(`Failed to update status for PR ${prId}:`, error);
        throw new Error(`Failed to update PR status: ${error instanceof Error ? error.message : String(error)}`);
    }
}

/**
 * Updates arbitrary fields of a PR document (except status, which should use updatePRStatus).
 * @param prId - The ID of the PR to update.
 * @param updateData - An object containing the fields to update.
 * @returns A promise that resolves when the update is complete.
 */
export async function updatePR(prId: string, updateData: Partial<PRRequest>): Promise<void> {
  logger.info(`Updating PR ${prId} with data:`, updateData);
  if (!prId || !updateData || Object.keys(updateData).length === 0) {
    logger.error('updatePR called with invalid arguments.');
    throw new Error('Missing required arguments for PR update.');
  }
  try {
    const prDocRef = doc(db, PR_COLLECTION, prId);
    // Remove status if present (should use updatePRStatus for status updates)
    if ('status' in updateData) {
      delete (updateData as any).status;
    }
    
    // Clean undefined values to prevent Firebase errors
    const cleanedData = Object.fromEntries(
      Object.entries(updateData).filter(([_, value]) => value !== undefined)
    );
    
    await updateDoc(prDocRef, { ...cleanedData, updatedAt: serverTimestamp() });
    logger.info(`Successfully updated PR ${prId}`);
  } catch (error) {
    logger.error(`Failed to update PR ${prId}:`, error);
    throw new Error(`Failed to update PR: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Finds the relevant approval rule for a given organization and amount.
 * @param organization - The organization name or ID.
 * @param amount - The estimated or total amount of the PR.
 * @returns A promise resolving to the matching ApprovalRule or null.
 */
export async function getRuleForOrganization(
    organization: string, 
    amount: number
): Promise<ApprovalRule | null> {
    logger.info(`Fetching approval rule for org: ${organization}, amount: ${amount}`);
    if (!organization) {
        logger.warn('getRuleForOrganization called with missing organization.');
        return null;
    }

    try {
        const rulesCollectionRef = collection(db, APPROVAL_RULES_COLLECTION);
        
        // Query for rules matching the organization, where amount is >= minAmount,
        // ordered by minAmount descending to get the highest applicable rule first.
        const q = query(
            rulesCollectionRef, 
            where('organization', '==', organization),
            where('minAmount', '<=', amount),
            orderBy('minAmount', 'desc'), 
            limit(1) 
        );

        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            logger.warn(`No applicable approval rule found for org ${organization} and amount ${amount}.`);
            return null;
        }

        const docSnap = querySnapshot.docs[0];
        const ruleData = docSnap.data();
        
        const rule: ApprovalRule = {
            id: docSnap.id,
            organization: ruleData.organization,
            minAmount: ruleData.minAmount,
            approverLevel: ruleData.approverLevel, 
            // Map other fields...
        };

        logger.info(`Found matching approval rule ID: ${rule.id} with level ${rule.approverLevel}`);
        return rule;

    } catch (error) {
        logger.error(`Failed to fetch approval rule for org ${organization}:`, error);
        throw new Error(`Failed to fetch approval rule: ${error instanceof Error ? error.message : String(error)}`);
    }
}

/**
 * Creates a new Purchase Request.
 * Automatically assigns PR number and sets initial status.
 * @param prData - Data for the new PR, excluding id, prNumber, createdAt, updatedAt.
 * @returns A promise that resolves with the new PR's ID and number.
 */
export async function createPR(
  prData: PRCreateData
): Promise<{ prId: string; prNumber: string }> {
   logger.info('Attempting to create PR with data:', prData);
   if (!prData || !prData.requestorId) {
     logger.error('createPR called with invalid prData or missing requestorId.');
     throw new Error('Invalid PR data provided.');
   }

   try {
     const prNumber = await generatePRNumber(prData.organization || 'UNK'); // Pass organization

     const finalPRData: Omit<PRRequest, 'id'> = {
       ...prData,
       prNumber,
       status: PRStatus.SUBMITTED,
       totalAmount: prData.estimatedAmount, // Add totalAmount, using estimatedAmount initially
       createdAt: new Date().toISOString(), // Set server-side or consistent client-side
       updatedAt: new Date().toISOString(),
       history: [], // Initialize history
       statusHistory: [], // Initialize status history
       // approvalWorkflow initialization might be needed here
     };

     // Use addDoc to create a new document with an auto-generated ID
     const docRef = await addDoc(collection(db, PR_COLLECTION), finalPRData);
     logger.info(`Successfully created PR ${prNumber} with ID ${docRef.id}`);
     return { prId: docRef.id, prNumber: prNumber };

   } catch (error) {
     logger.error('Failed to create PR:', error);
     throw new Error(`Failed to create purchase request: ${error instanceof Error ? error.message : String(error)}`);
   }
}

/**
 * Fetches all PRs for a specific user, optionally filtered by organization.
 * @param userId - The ID of the user whose PRs to fetch.
 * @param organization - Optional organization name to filter by.
 * @param showOnlyMyPRs - If true, only show PRs where the user is the requestor.
 * @returns A promise that resolves with an array of PRs.
 */
export async function getUserPRs(
    userId: string, 
    organization?: string, 
    showOnlyMyPRs: boolean = true
): Promise<PRRequest[]> {
    logger.info(`Fetching PRs for user ${userId}, org: ${organization}, onlyMine: ${showOnlyMyPRs}`);
    if (!userId) {
        logger.error('getUserPRs called without userId');
        throw new Error('User ID is required to fetch PRs.');
    }

    try {
        const prCollectionRef = collection(db, PR_COLLECTION);
        const constraints: QueryConstraint[] = [];

        if (showOnlyMyPRs) {
            constraints.push(where('requestorId', '==', userId));
        } else {
            // If not only showing my PRs, maybe fetch all PRs the user can *see*?
            // This might involve checking roles/permissions or if they are an approver.
            // For now, let's assume it means all PRs in their org if org is provided,
            // or all PRs if no org is provided (requires appropriate Firestore rules).
            // If showing all PRs user can *act on* is needed, more complex logic is required.
            logger.warn('Fetching non-owned PRs - current logic might need refinement based on visibility rules.');
            // Example: Fetching all PRs (adjust constraints based on actual requirements)
             if (organization) {
                 constraints.push(where('organization', '==', organization));
             } 
            // If no organization and not showOnlyMyPRs, fetch all? Might be too broad.
            // Consider adding permission checks here or ensuring Firestore rules handle this.
        }
        
        if (organization && constraints.length === 0) { // Add org filter if not added by showOnlyMyPRs logic
           constraints.push(where('organization', '==', organization));
        }

        constraints.push(orderBy('createdAt', 'desc')); // Order by creation date

        const q = query(prCollectionRef, ...constraints);
        const querySnapshot = await getDocs(q);

        const prs: PRRequest[] = [];
        querySnapshot.forEach((docSnapshot) => {
            const data = docSnapshot.data();
            prs.push({
                id: docSnapshot.id,
                ...data,
                createdAt: safeTimestampToISO(data.createdAt),
                updatedAt: safeTimestampToISO(data.updatedAt),
                requiredDate: safeTimestampToISO(data.requiredDate),
                lastModifiedAt: safeTimestampToISO(data.lastModifiedAt), // Ensure lastModifiedAt is serializable
                // Ensure nested timestamps are also converted
                history: (data.history || []).map((item: any): HistoryItem => ({
                    ...item,
                    timestamp: safeTimestampToISO(item.timestamp),
                })),
                statusHistory: (data.statusHistory || []).map((item: any): StatusHistoryItem => ({
                    ...item,
                    timestamp: safeTimestampToISO(item.timestamp),
                })),
                approvalWorkflow: data.approvalWorkflow ? {
                    ...data.approvalWorkflow,
                    lastUpdated: safeTimestampToISO(data.approvalWorkflow.lastUpdated),
                    approvalHistory: (data.approvalWorkflow.approvalHistory || []).map((item: any): ApprovalHistoryItem => ({
                      ...item,
                      timestamp: safeTimestampToISO(item.timestamp),
                  })),
                } : undefined,
            } as PRRequest);
        });

        logger.info(`Fetched ${prs.length} PRs for user ${userId}`);
        return prs;

    } catch (error) {
        logger.error(`Failed to fetch PRs for user ${userId}:`, error);
        throw new Error(`Failed to retrieve purchase requests: ${error instanceof Error ? error.message : String(error)}`);
    }
}

/**
 * Generates a new PR number based on the organization and current date.
 * @param organization - The organization code.
 * @returns The next PR number
 */
export async function generatePRNumber(organization: string = 'UNK'): Promise<string> {
  const orgPrefix = organization.substring(0, 3).toUpperCase();
  const currentYear = new Date().getFullYear();
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 7).toUpperCase();
  const prNumber = `${orgPrefix}-${currentYear}${String(new Date().getMonth() + 1).padStart(2, '0')}-${randomSuffix}`;
  logger.info(`Generated PR Number: ${prNumber}`);
  return prNumber;
}

/**
 * Deletes a Purchase Request.
 * @param prId - The ID of the PR to delete.
 * @returns A promise that resolves when the deletion is complete.
 */
export async function deletePR(prId: string): Promise<void> {
  logger.info(`Attempting to delete PR ${prId}`);
  if (!prId) {
      logger.error('deletePR called without prId');
      throw new Error('PR ID is required to delete.');
  }
  try {
      const prDocRef = doc(db, PR_COLLECTION, prId);
      await deleteDoc(prDocRef); 
      logger.info(`Successfully deleted PR ${prId}`);
  } catch (error) {
      logger.error(`Failed to delete PR ${prId}:`, error);
      throw new Error(`Failed to delete purchase request: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// Aggregated service object for legacy compatibility
export const prService = {
  getPR,
  updatePR,
  updatePRStatus,
  getRuleForOrganization,
  createPR,
  getUserPRs,
  generatePRNumber,
  deletePR
};