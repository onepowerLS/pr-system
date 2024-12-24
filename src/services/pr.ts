import { 
  collection,
  doc,
  addDoc,
  updateDoc,
  getDoc,
  getDocs,
  query,
  where,
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
    return data.toDate().toISOString();
  }
  
  if (Array.isArray(data)) {
    return data.map(item => convertTimestamps(item));
  }
  
  if (typeof data === 'object') {
    return Object.keys(data).reduce((result, key) => ({
      ...result,
      [key]: convertTimestamps(data[key])
    }), {});
  }
  
  return data;
};

export const prService = {
  createPR: async (prData: Omit<PRRequest, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const prRef = await addDoc(collection(db, PR_COLLECTION), {
        ...prData,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        status: PRStatus.SUBMITTED
      });
      
      // Send notification for new PR submission
      const submitter: User = {
        id: prData.submittedBy,
        name: prData.requestor,
        email: prData.email,
        role: 'SUBMITTER' // Default role for notification purposes
      };

      await notificationService.handleStatusChange(
        prRef.id,
        '', // No previous status for new PR
        PRStatus.SUBMITTED,
        submitter
      );
      
      return prRef.id;
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
    try {
      const q = query(
        collection(db, PR_COLLECTION),
        where('createdBy', '==', userId)
      );

      const querySnapshot = await getDocs(q);
      const prs = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...convertTimestamps(doc.data())
      })) as PRRequest[];

      // Filter by organization if provided and sort by ISO date string
      return prs
        .filter(pr => !organization || pr.organization === organization)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
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
