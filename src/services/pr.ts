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
  deleteDoc
} from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { db } from '../config/firebase';
import { PRRequest, PRStatus, User } from '../types/pr';
import { notificationService } from './notification';
import { calculateDaysOpen } from '../utils/formatters';

const PR_COLLECTION = 'purchaseRequests';

// Convert Firestore timestamp to ISO string for Redux
const convertTimestamps = (data: any): any => {
  if (!data) return data;
  
  if (data instanceof Timestamp) {
    const date = data.toDate();
    console.log('Converting Timestamp:', {
      original: data.toDate().toISOString(),
      converted: date.toISOString()
    });
    return date.toISOString();
  }
  
  if (Array.isArray(data)) {
    return data.map(item => convertTimestamps(item));
  }
  
  if (typeof data === 'object' && data !== null) {
    // Check if the object has seconds and nanoseconds, which indicates it's a Firestore timestamp
    if ('seconds' in data && 'nanoseconds' in data) {
      const date = Timestamp.fromMillis(data.seconds * 1000 + Math.floor(data.nanoseconds / 1000000)).toDate();
      console.log('Converting raw timestamp:', {
        seconds: data.seconds,
        nanoseconds: data.nanoseconds,
        converted: date.toISOString()
      });
      return date.toISOString();
    }
    
    return Object.keys(data).reduce((result, key) => ({
      ...result,
      [key]: convertTimestamps(data[key])
    }), {});
  }
  
  return data;
};

// Calculate PR metrics
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

export const prService = {
  createPR: async (prData: Partial<PRRequest>): Promise<string> => {
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
      const prNumber = await prService.generatePRNumber(prData.organization);

      // Create a new Date object for current time
      const now = new Date();
      
      // Ensure isUrgent has a default value and is synced with metrics
      const isUrgent = Boolean(prData.isUrgent);
      const finalPRData = {
        ...prData,
        status: PRStatus.SUBMITTED,
        createdAt: Timestamp.fromDate(now),
        updatedAt: Timestamp.fromDate(now),
        submittedBy: prData.requestorId,
        requestorId: prData.requestorId,
        prNumber: prNumber,
        isUrgent,
        metrics: {
          daysOpen: 0,
          isOverdue: false,
          isUrgent,
          ...prData.metrics
        }
      };

      console.log('Final PR data:', finalPRData);

      const docRef = await addDoc(collection(db, PR_COLLECTION), finalPRData);

      // Send email notification
      try {
        const functions = getFunctions();
        const sendPRNotification = httpsCallable(functions, 'sendPRNotification');
        
        // Get requestor info from the nested requestor object
        const requestorName = prData.requestor?.name;
        const requestorEmail = prData.requestor?.email;

        if (!requestorName || !requestorEmail) {
          console.error('Missing requestor information:', { requestorName, requestorEmail });
          throw new Error('Requestor name and email are required');
        }

        await sendPRNotification({
          prNumber: prNumber,
          requestorName: requestorName,
          requestorEmail: requestorEmail,
          department: prData.department,
          description: prData.description,
          requiredDate: prData.requiredDate,
          isUrgent: prData.isUrgent ?? false,
          items: prData.lineItems || []
        });

        console.log('PR notification email sent successfully');
      } catch (emailError) {
        console.error('Error sending PR notification email:', emailError);
        // Don't throw the error as the PR was created successfully
      }

      return docRef.id;
    } catch (error) {
      console.error('Error creating PR:', error);
      throw error;
    }
  },

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

      const count = thisMonthPRs.length + 1;
      console.log('Current PR count for month:', count);

      // Format: PR-YYYYMM-XXX where XXX is sequential number
      const prNumber = `PR-${yearMonth}-${count.toString().padStart(3, '0')}`;
      console.log('Generated PR number:', prNumber);

      // Validate uniqueness
      const existingQ = query(
        collection(db, PR_COLLECTION),
        where('prNumber', '==', prNumber)
      );
      const existingDocs = await getDocs(existingQ);
      
      if (!existingDocs.empty) {
        console.error('PR number collision detected:', prNumber);
        throw new Error('Failed to generate unique PR number');
      }

      return prNumber;
    } catch (error) {
      console.error('Error generating PR number:', error);
      throw error;
    }
  },

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
        status: PRStatus.SUBMITTED,
        createdAt: Timestamp.fromDate(new Date()),
        updatedAt: Timestamp.fromDate(new Date()),
        submittedBy: prData.requestorId,
        requestorId: prData.requestorId,
        prNumber: prNumber  // Add PR number
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

  updatePR: async (prId: string, updates: Partial<PRRequest>) => {
    try {
      const prRef = doc(db, PR_COLLECTION, prId);
      await updateDoc(prRef, {
        ...updates,
        updatedAt: Timestamp.now()
      });
    } catch (error) {
      console.error('Error updating PR:', error);
      throw error;
    }
  },

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
  },

  getUserPRs: async (userId: string, organization: string): Promise<PRRequest[]> => {
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
        const topLevelUrgent = data.isUrgent === true || data.isUrgent === 'true' || data.isUrgent === 1;
        const metricsUrgent = data.metrics?.isUrgent === true || data.metrics?.isUrgent === 'true' || data.metrics?.isUrgent === 1;
        const isUrgent = topLevelUrgent || metricsUrgent;

        console.log('Converting PR urgency:', {
          id: doc.id,
          prNumber: data.prNumber,
          topLevelUrgent,
          metricsUrgent,
          combinedUrgent: isUrgent,
          rawTopLevel: data.isUrgent,
          rawMetrics: data.metrics?.isUrgent
        });

        const pr = {
          id: doc.id,
          ...data,
          isUrgent,  // Use the combined urgency state
          metrics: {
            ...data.metrics,
            isUrgent  // Sync with top-level isUrgent
          },
          createdAt: data.createdAt?.toDate(),
          updatedAt: data.updatedAt?.toDate(),
          completedAt: data.completedAt?.toDate(),
          rejectedAt: data.rejectedAt?.toDate(),
          orderedAt: data.orderedAt?.toDate(),
          confirmedAt: data.confirmedAt?.toDate(),
          resubmittedAt: data.resubmittedAt?.toDate(),
          revisionAt: data.revisionAt?.toDate(),
          canceledAt: data.canceledAt?.toDate()
        } as PRRequest;

        console.log('Processed PR:', {
          id: pr.id,
          prNumber: pr.prNumber,
          topLevelUrgent,
          metricsUrgent,
          processedIsUrgent: pr.isUrgent,
          processedMetricsUrgent: pr.metrics?.isUrgent
        });

        return pr;
      });

      console.log('All processed PRs:', prs.map(pr => ({
        id: pr.id,
        prNumber: pr.prNumber,
        isUrgent: pr.isUrgent,
        metricsUrgent: pr.metrics?.isUrgent,
        organization: pr.organization,
        requestorId: pr.requestorId,
        status: pr.status
      })));

      return prs;
    } catch (error) {
      console.error('Error getting user PRs:', error);
      throw error;
    }
  },

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

  updateStatus: async (prId: string, status: PRStatus, updatedBy: User): Promise<void> => {
    try {
      const prRef = doc(db, PR_COLLECTION, prId);
      const prDoc = await getDoc(prRef);
      
      if (!prDoc.exists()) {
        throw new Error('PR not found');
      }

      const currentStatus = prDoc.data().status;
      
      await updateDoc(prRef, {
        status,
        updatedAt: Timestamp.now()
      });

      // Send notification for status change
      await notificationService.handleStatusChange(
        prId,
        currentStatus,
        status,
        updatedBy
      );
    } catch (error) {
      console.error('Error updating PR status:', error);
      throw error;
    }
  },

  async deletePR(prId: string): Promise<void> {
    try {
      const prRef = doc(db, PR_COLLECTION, prId);
      await deleteDoc(prRef);
    } catch (error) {
      console.error('Error deleting PR:', error);
      throw error;
    }
  }
};
