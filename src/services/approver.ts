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

  private normalizeOrganizationId(orgId: string | { id: string; name: string }): string {
    if (!orgId) return '';
    const id = typeof orgId === 'string' ? orgId : orgId.id;
    return id.toLowerCase().replace(/[^a-z0-9]/g, '_');
  }

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

  async getApprovers(organizationId: string): Promise<Approver[]> {
    try {
      const approversRef = collection(this.db, 'approverList');
      const q = query(approversRef, where('organizationId', '==', organizationId));
      const querySnapshot = await getDocs(q);
      
      const approvers: Approver[] = [];
      querySnapshot.forEach((doc) => {
        approvers.push({
          id: doc.id,
          ...doc.data()
        } as Approver);
      });

      return approvers;
    } catch (error) {
      console.error('Error getting approvers:', error);
      throw error;
    }
  }

  async getDepartmentApprovers(organization: string | { id: string; name: string }, department: string): Promise<Approver[]> {
    try {
      const normalizedOrgId = this.normalizeOrganizationId(organization);
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
        a.department === department && 
        a.organization === normalizedOrgId
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
