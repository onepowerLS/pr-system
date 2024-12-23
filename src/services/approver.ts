import { getFirestore, collection, query, where, getDocs } from 'firebase/firestore';
import { User } from '../types/user';

interface Approver {
  id: string;
  name: string;
  email: string;
  role: string;
  department?: string;
  organization: string;
  isActive: boolean;
}

class ApproverService {
  private db = getFirestore();

  async getActiveApprovers(): Promise<Approver[]> {
    try {
      console.log('ApproverService: Getting active approvers');
      const approversRef = collection(this.db, 'approverList');
      const q = query(approversRef, where('isActive', '==', true));
      const querySnapshot = await getDocs(q);
      
      const approvers = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Approver));

      console.log(`ApproverService: Found ${approvers.length} active approvers`);
      return approvers;
    } catch (error) {
      console.error('ApproverService: Error getting active approvers:', error);
      throw new Error('Failed to get active approvers. Please try again.');
    }
  }

  async getApprovers(organization: string): Promise<Approver[]> {
    try {
      console.log('ApproverService: Getting approvers for organization:', organization);
      const approversRef = collection(this.db, 'approverList');
      const q = query(
        approversRef, 
        where('isActive', '==', true),
        where('organization', '==', organization)
      );
      const querySnapshot = await getDocs(q);
      
      const approvers = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Approver));

      console.log(`ApproverService: Found ${approvers.length} approvers for organization ${organization}`);
      console.log('ApproverService: Approvers:', approvers);
      return approvers;
    } catch (error) {
      console.error('ApproverService: Error getting approvers:', error);
      throw new Error(`Failed to get approvers for organization ${organization}. Please try again.`);
    }
  }

  async getDepartmentApprovers(organization: string, department: string): Promise<Approver[]> {
    try {
      console.log('ApproverService: Getting approvers for department:', department);
      const approversRef = collection(this.db, 'approverList');
      const q = query(
        approversRef, 
        where('isActive', '==', true),
        where('organization', '==', organization),
        where('department', '==', department)
      );
      const querySnapshot = await getDocs(q);
      
      const approvers = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Approver));

      console.log(`ApproverService: Found ${approvers.length} approvers for department ${department}`);
      return approvers;
    } catch (error) {
      console.error('ApproverService: Error getting department approvers:', error);
      throw new Error(`Failed to get approvers for department ${department}. Please try again.`);
    }
  }
}

export const approverService = new ApproverService();
