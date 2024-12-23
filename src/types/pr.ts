export interface PRRequest {
  id: string;
  requestor: User;
  status: PRStatus;
  items: PRItem[];
  approvers: User[];
  createdAt: string; // ISO string in Redux
  updatedAt: string; // ISO string in Redux
  expectedLandingDate?: string; // ISO string in Redux
  totalAmount: number;
  currency: string;
  department: string;
  projectCategory: string;
  site: string;
  organization: string;
  attachments?: Attachment[];
  metrics?: PRMetrics;
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
  uploadedAt: string; // ISO string in Redux
  uploadedBy: User;
}

export enum PRStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  IN_QUEUE = 'IN_QUEUE',
  ORDERED = 'ORDERED',
  COMPLETED = 'COMPLETED',
  REVISION_REQUIRED = 'REVISION_REQUIRED',
  REJECTED = 'REJECTED',
  CANCELED = 'CANCELED'
}

export enum UserRole {
  ADMIN = 'ADMIN',
  APPROVER = 'APPROVER',
  REQUESTOR = 'REQUESTOR',
  VIEWER = 'VIEWER'
}

export interface PRMetrics {
  daysOpen: number;
  isUrgent: boolean;
  isOverdue: boolean;
  quotesRequired: boolean;
  adjudicationRequired: boolean;
  customsClearanceRequired: boolean;
  completionPercentage: number;
  queuePosition?: number;
}
