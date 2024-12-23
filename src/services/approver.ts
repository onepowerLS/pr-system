import { getFirestore, collection, query, where, getDocs } from 'firebase/firestore';
import { User } from '../types/user';

class ApproverService {
  private db = getFirestore();

  async getActiveApprovers(): Promise<User[]> {
    try {
      const approversRef = collection(this.db, 'approvers');
      const q = query(approversRef, where('isActive', '==', true));
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as User));
    } catch (error) {
      console.error('Error getting active approvers:', error);
      throw error;
    }
  }

  async getApprovers(organization: string): Promise<User[]> {
    try {
      const approversRef = collection(this.db, 'approvers');
      const q = query(
        approversRef, 
        where('isActive', '==', true),
        where('organization', '==', organization)
      );
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as User));
    } catch (error) {
      console.error('Error getting approvers:', error);
      throw error;
    }
  }
}

export const approverService = new ApproverService();
