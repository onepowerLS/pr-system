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
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { PRRequest, PRStatus, User } from '../types/pr';
import { notificationService } from './notification';

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
      
      const finalPRData = {
        ...prData,
        status: PRStatus.SUBMITTED,
        createdAt: Timestamp.fromDate(now),
        updatedAt: Timestamp.fromDate(now),
        submittedBy: prData.requestorId,
        requestorId: prData.requestorId,
        prNumber: prNumber
      };

      console.log('Final PR data:', finalPRData);

      const docRef = await addDoc(collection(db, PR_COLLECTION), finalPRData);
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
      const prRef = doc(db, PR_COLLECTION, prId);
      const prSnap = await getDoc(prRef);
      
      if (!prSnap.exists()) {
        return null;
      }

      const data = prSnap.data();
      return {
        id: prSnap.id,
        ...convertTimestamps(data)
      } as PRRequest;
    } catch (error) {
      console.error('Error getting PR:', error);
      throw error;
    }
  },

  getUserPRs: async (userId: string, organization?: string): Promise<PRRequest[]> => {
    console.log('PR Service: Getting PRs for user:', userId, 'org:', organization);
    try {
      // Start with basic query
      let q = query(
        collection(db, PR_COLLECTION),
        where('submittedBy', '==', userId)
      );

      // Add organization filter if provided
      if (organization) {
        q = query(
          collection(db, PR_COLLECTION),
          where('submittedBy', '==', userId),
          where('organization', '==', organization)
        );
      }

      const querySnapshot = await getDocs(q);
      console.log('Raw Firestore data:', querySnapshot.docs.map(doc => ({
        id: doc.id,
        data: doc.data()
      })));

      const prs = querySnapshot.docs.map(doc => {
        const data = doc.data();
        console.log('Processing PR document:', {
          id: doc.id,
          createdAt: data.createdAt,
          createdAtType: data.createdAt?.constructor?.name,
          timestamp: data.createdAt?.toDate?.()
        });
        
        return {
          id: doc.id,
          ...convertTimestamps(data)
        };
      }) as PRRequest[];

      // Sort by created date descending
      prs.sort((a, b) => {
        const dateA = new Date(a.createdAt);
        const dateB = new Date(b.createdAt);
        return dateB.getTime() - dateA.getTime();
      });

      console.log('Processed PRs:', prs.map(pr => ({
        id: pr.id,
        createdAt: pr.createdAt,
        createdAtType: typeof pr.createdAt
      })));
      
      return prs;
    } catch (error) {
      console.error('Error getting user PRs:', error);
      throw error;
    }
  },

  getPendingApprovals: async (approverId: string, organization?: string): Promise<PRRequest[]> => {
    try {
      const q = query(
        collection(db, PR_COLLECTION),
        where('status', '==', PRStatus.PENDING)
      );

      const querySnapshot = await getDocs(q);
      const prs = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...convertTimestamps(doc.data())
      })) as PRRequest[];

      // Filter by approver and organization, sort by ISO date string
      return prs
        .filter(pr => 
          pr.approvers?.includes(approverId) && 
          (!organization || pr.organization === organization)
        )
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
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
  }
};
