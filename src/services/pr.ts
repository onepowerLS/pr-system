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
  DocumentReference
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { PRRequest, PRStatus, User } from '../types/pr';

export const prService = {
  createPR: async (prData: Omit<PRRequest, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const prRef = await addDoc(collection(db, 'purchaseRequests'), {
        ...prData,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        status: PRStatus.DRAFT
      });
      
      return prRef.id;
    } catch (error) {
      console.error('Error creating PR:', error);
      throw error;
    }
  },

  updatePR: async (prId: string, updates: Partial<PRRequest>) => {
    try {
      const prRef = doc(db, 'purchaseRequests', prId);
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
      const prRef = doc(db, 'purchaseRequests', prId);
      const prSnap = await getDoc(prRef);
      
      if (!prSnap.exists()) {
        return null;
      }

      return {
        id: prSnap.id,
        ...prSnap.data()
      } as PRRequest;
    } catch (error) {
      console.error('Error getting PR:', error);
      throw error;
    }
  },

  getUserPRs: async (userId: string, status?: PRStatus) => {
    try {
      let q = query(
        collection(db, 'purchaseRequests'),
        where('requestor.id', '==', userId)
      );

      if (status) {
        q = query(q, where('status', '==', status));
      }

      const querySnapshot = await getDocs(q);
      const prs = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as PRRequest[];
      
      // Sort in memory instead of using orderBy to avoid needing a composite index
      return prs.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
    } catch (error) {
      console.error('Error getting user PRs:', error);
      throw error;
    }
  },

  getPendingApprovals: async (approverId: string) => {
    try {
      const q = query(
        collection(db, 'purchaseRequests'),
        where('approvers', 'array-contains', approverId),
        where('status', '==', PRStatus.PENDING_APPROVAL),
        orderBy('createdAt', 'desc')
      );

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as PRRequest[];
    } catch (error) {
      console.error('Error getting pending approvals:', error);
      throw error;
    }
  },

  updateStatus: async (prId: string, status: PRStatus, updatedBy: User) => {
    try {
      const prRef = doc(db, 'purchaseRequests', prId);
      await updateDoc(prRef, {
        status,
        updatedAt: Timestamp.now(),
        [`statusHistory.${status}`]: {
          timestamp: Timestamp.now(),
          updatedBy
        }
      });
    } catch (error) {
      console.error('Error updating PR status:', error);
      throw error;
    }
  }
};
