import { getFirestore, collection, query, where, getDocs } from 'firebase/firestore';
import { User } from '../types/user';

interface Approver {
  id: string;
  name: string;
  email: string;
  department: string;
  approvalLimit: number;
  isActive: boolean;
  organization?: string;
}

class ApproverService {
  private db = getFirestore();

  async getActiveApprovers(): Promise<Approver[]> {
    try {
      console.log('ApproverService: Getting active approvers');
      const approversRef = collection(this.db, 'approverList');
      const q = query(approversRef, where('isActive', '==', true));
      const querySnapshot = await getDocs(q);
      
      const approvers = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.Name,
          email: data.Email,
          department: data.Department,
          approvalLimit: data['Approval Limit'],
          isActive: data['Active Status (Y/N)'] === 'Y',
          organization: '1PWR LESOTHO'
        } as Approver;
      });

      console.log(`ApproverService: Found ${approvers.length} active approvers`);
      console.log('ApproverService: Approvers:', approvers);
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
        where('isActive', '==', true)
      );
      const querySnapshot = await getDocs(q);
      
      const approvers = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.Name,
          email: data.Email,
          department: data.Department,
          approvalLimit: data['Approval Limit'],
          isActive: data['Active Status (Y/N)'] === 'Y',
          organization: '1PWR LESOTHO'
        } as Approver;
      }).filter(a => a.isActive);

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
      const q = query(approversRef);
      const querySnapshot = await getDocs(q);
      
      const approvers = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.Name,
          email: data.Email,
          department: data.Department,
          approvalLimit: data['Approval Limit'],
          isActive: data['Active Status (Y/N)'] === 'Y',
          organization: '1PWR LESOTHO'
        } as Approver;
      }).filter(a => 
        a.isActive && 
        a.department === department
      );

      console.log(`ApproverService: Found ${approvers.length} approvers for department ${department}`);
      console.log('ApproverService: Approvers:', approvers);
      return approvers;
    } catch (error) {
      console.error('ApproverService: Error getting department approvers:', error);
      throw new Error(`Failed to get approvers for department ${department}. Please try again.`);
    }
  }
}

export const approverService = new ApproverService();
