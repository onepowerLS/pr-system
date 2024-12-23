import { getFirestore, collection, query, where, getDocs } from 'firebase/firestore';
import { User } from '../types/user';

class ApproverService {
  private db = getFirestore();

  async getActiveApprovers(): Promise<User[]> {
    try {
      console.log('ApproverService: Getting active approvers');
      const approversRef = collection(this.db, 'approvers');
      const q = query(approversRef, where('isActive', '==', true));
      const querySnapshot = await getDocs(q);
      
      const approvers = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as User));

      console.log(`ApproverService: Found ${approvers.length} active approvers`);
      return approvers;
    } catch (error) {
      console.error('ApproverService: Error getting active approvers:', error);
      throw new Error('Failed to get active approvers. Please try again.');
    }
  }

  async getApprovers(organization: string): Promise<User[]> {
    try {
      console.log('ApproverService: Getting approvers for organization:', organization);
      const approversRef = collection(this.db, 'users');  
      const q = query(
        approversRef, 
        where('isActive', '==', true),
        where('organization', '==', organization),
        where('role', 'in', ['ADMIN', 'MANAGER', 'FINANCE'])  
      );
      const querySnapshot = await getDocs(q);
      
      const approvers = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as User));

      console.log(`ApproverService: Found ${approvers.length} approvers for organization ${organization}`);
      return approvers;
    } catch (error) {
      console.error('ApproverService: Error getting approvers:', error);
      throw new Error(`Failed to get approvers for organization ${organization}. Please try again.`);
    }
  }

  async getDepartmentApprovers(organization: string, department: string): Promise<User[]> {
    try {
      console.log('ApproverService: Getting approvers for department:', department);
      const approversRef = collection(this.db, 'users');
      const q = query(
        approversRef, 
        where('isActive', '==', true),
        where('organization', '==', organization),
        where('department', '==', department),
        where('role', '==', 'MANAGER')
      );
      const querySnapshot = await getDocs(q);
      
      const approvers = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as User));

      console.log(`ApproverService: Found ${approvers.length} approvers for department ${department}`);
      return approvers;
    } catch (error) {
      console.error('ApproverService: Error getting department approvers:', error);
      throw new Error(`Failed to get approvers for department ${department}. Please try again.`);
    }
  }
}

export const approverService = new ApproverService();
