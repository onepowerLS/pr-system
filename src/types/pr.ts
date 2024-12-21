export interface PRRequest {
  id: string;
  requestor: User;
  status: PRStatus;
  items: PRItem[];
  approvers: User[];
  createdAt: Date;
  updatedAt: Date;
  expectedLandingDate?: Date;
  totalAmount: number;
  currency: string;
  department: string;
  projectCategory: string;
  site: string;
  attachments?: Attachment[];
}

export interface PRItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  currency: string;
  totalPrice: number;
  vendor?: string;
  category?: string;
  notes?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  department?: string;
  isActive: boolean;
}

export interface Attachment {
  id: string;
  name: string;
  url: string;
  type: string;
  size: number;
  uploadedAt: Date;
  uploadedBy: User;
}

export enum PRStatus {
  DRAFT = 'DRAFT',
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  APPROVED = 'APPROVED',
  ORDERED = 'ORDERED',
  PARTIALLY_RECEIVED = 'PARTIALLY_RECEIVED',
  RECEIVED = 'RECEIVED',
  CANCELLED = 'CANCELLED',
  REJECTED = 'REJECTED'
}

export enum UserRole {
  ADMIN = 'ADMIN',
  APPROVER = 'APPROVER',
  REQUESTOR = 'REQUESTOR',
  VIEWER = 'VIEWER'
}
