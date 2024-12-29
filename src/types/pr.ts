export interface PRRequest {
  id: string;
  prNumber: string;  // Add PR number field
  requestorId: string;
  requestorEmail: string; // Add email field
  requestor: User;
  submittedBy: string;
  status: PRStatus;
  items: PRItem[];
  approvers: ApprovalInfo[];
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
  quotes?: Quote[];
  workflow?: PRWorkflow;
  description: string;
  resubmittedAt?: string;
  confirmedAt?: string;
  orderedAt?: string;
  completedAt?: string;
  revisionAt?: string;
  rejectedAt?: string;
  canceledAt?: string;
  procComments?: string;
  comments?: string;
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
  approvalLimit?: number;  // Maximum amount in LSL that this approver can approve
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

export interface Quote {
  id: string;
  vendorName: string;
  amount: number;
  currency: string;
  attachment?: Attachment;
  notes?: string;
  submittedAt: string;
  submittedBy: User;
}

export interface ApprovalInfo {
  approver: User;
  approvedAt?: string;
  notes?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
}

export interface PRWorkflow {
  currentStep: WorkflowStep;
  adjudication?: AdjudicationInfo;
  financeApproval?: ApprovalInfo;
  procurementReview?: ApprovalInfo;
  history: WorkflowHistory[];
}

export interface AdjudicationInfo {
  notes: string;
  addedBy: User;
  addedAt: string;
  attachments?: Attachment[];
}

export interface WorkflowHistory {
  step: WorkflowStep;
  timestamp: string;
  user: User;
  notes?: string;
}

export enum WorkflowStep {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  IN_QUEUE = 'IN_QUEUE',
  ADJUDICATION_REQUIRED = 'ADJUDICATION_REQUIRED',
  ADJUDICATION_COMPLETE = 'ADJUDICATION_COMPLETE',
  FINANCE_REVIEW = 'FINANCE_REVIEW',
  PROCUREMENT_REVIEW = 'PROCUREMENT_REVIEW',
  READY_FOR_PO = 'READY_FOR_PO',
  PO_CREATED = 'PO_CREATED'
}

export enum PRStatus {
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

export const PR_AMOUNT_THRESHOLDS = {
  ADMIN_APPROVAL: 1000,      // Below this amount requires admin approval
  QUOTES_REQUIRED: 5000,     // Above this amount requires 3 quotes (unless approved vendor)
  FINANCE_APPROVAL: 50000,   // Above this amount requires finance approval and adjudication
} as const;

export interface PRMetrics {
  daysOpen: number;
  isUrgent: boolean;
  isOverdue: boolean;
  quotesRequired: boolean;
  adjudicationRequired: boolean;
  financeApprovalRequired: boolean;
  isApprovedVendor: boolean;
  completionPercentage: number;
  queuePosition?: number;
  daysResubmission?: number;
  daysOrdered?: number;
  daysOverdue?: number;
  timeToClose?: number;
  expectedLandingDate?: string;
}
