export interface User {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'FINANCE_APPROVER' | 'PROCUREMENT' | 'USER';
  department?: string;
  isActive: boolean;
  approvalLimit?: number;
}
