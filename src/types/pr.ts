/**
 * @fileoverview Purchase Request Type Definitions
 * @version 2.0.0
 * 
 * Description:
 * Core type definitions for the Purchase Request (PR) system. These types define
 * the shape of data throughout the application, from database schema to UI components.
 * 
 * Data Model Notes:
 * The PR system follows a hierarchical structure:
 * - PRRequest: Root entity containing core PR data
 *   ├── LineItems: Individual items being requested
 *   ├── Quotes: Vendor quotes for the PR
 *   ├── Workflow: Approval and processing steps
 *   └── Metrics: Performance and status metrics
 * 
 * Status Flow:
 * SUBMITTED -> PENDING_APPROVAL -> [APPROVED | REJECTED] ->
 * [IN_QUEUE | REVISION_REQUIRED] -> ORDERED -> [PARTIALLY_RECEIVED | RECEIVED] -> COMPLETED
 * 
 * Related Modules:
 * - src/services/pr.ts: Main service using these types
 * - src/components/pr/*: UI components consuming these types
 * - Firestore: Database schema mirrors these types
 */

import { UploadedFile } from '../services/storage';

/**
 * Purchase Request Status Enum
 * Defines all possible states a PR can be in
 */
export enum PRStatus {
  /** Initial state when PR is first created */
  SUBMITTED = 'SUBMITTED',
  /** PR is in procurement queue for processing */
  IN_QUEUE = 'IN_QUEUE',
  /** Awaiting approval from designated approvers */
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  /** PR has been approved and is ready for processing */
  APPROVED = 'APPROVED',
  /** Purchase order has been placed */
  ORDERED = 'ORDERED',
  /** Some items have been received */
  PARTIALLY_RECEIVED = 'PARTIALLY_RECEIVED',
  /** PR has been fully processed and closed */
  COMPLETED = 'COMPLETED',
  /** Changes requested by approver */
  REVISION_REQUIRED = 'REVISION_REQUIRED',
  /** PR has been canceled by requestor or admin */
  CANCELED = 'CANCELED',
  /** PR has been rejected by approver */
  REJECTED = 'REJECTED'
}

/**
 * Main Purchase Request Interface
 * Contains all data related to a purchase request
 */
export interface PRRequest {
  /** Unique identifier for the PR */
  id: string;
  /** Human-readable PR number (format: ORG-YYYYMM-XXX) */
  prNumber: string;  
  /** Organization the PR belongs to */
  organization: string;
  /** Department making the request */
  department: string;
  /** Project or category the PR falls under */
  projectCategory: string;
  /** Detailed description of what is being requested */
  description: string;
  /** Site or location where items are needed */
  site: string;
  /** Type of expense (CAPEX/OPEX) */
  expenseType: string;
  /** Vehicle associated with request (if applicable) */
  vehicle?: string;
  /** Estimated total cost */
  estimatedAmount: number;
  /** Currency for the request */
  currency: string;
  /** Date by which items are needed */
  requiredDate: string;
  /** Preferred vendor if any */
  preferredVendor?: string;
  /** ID of user making request */
  requestorId: string;
  /** Email of requestor */
  requestorEmail: string;
  /** Full user object of requestor */ 
  requestor: User;
  /** List of user IDs who need to approve */
  approvers: string[];
  /** Individual items being requested */
  lineItems: LineItem[];
  /** Vendor quotes received */
  quotes: Quote[];
  /** Current status of the PR */
  status: PRStatus;
  /** Creation timestamp */
  createdAt: string;
  /** Last update timestamp */
  updatedAt: string;
  /** User who submitted the PR */
  submittedBy?: string;
  /** Calculated metrics */
  metrics: PRMetrics;
  /** Whether PR needs urgent processing */
  isUrgent: boolean;
  /** Supporting documents */
  attachments?: Attachment[];
  /** Workflow information */
  workflow?: PRWorkflow;
  /** Procurement team review */
  procurementReview?: ApprovalInfo;
  /** Finance team approval */
  financeApproval?: ApprovalInfo;
  /** Technical review information */
  adjudication?: AdjudicationInfo;
  /** Expected delivery date */
  expectedLandingDate?: string;
  /** Actual total amount */
  totalAmount: number;
  /** General comments */
  comments?: string;
  /** Procurement team comments */
  procComments?: string;
  /** Timestamp of last resubmission */
  resubmittedAt?: string;
  /** When PR was confirmed */
  confirmedAt?: string;
  /** When PO was placed */
  orderedAt?: string;
  /** When PR was completed */
  completedAt?: string;
  /** When revision was requested */
  revisionAt?: string;
  /** When PR was rejected */
  rejectedAt?: string;
  /** When PR was canceled */
  canceledAt?: string;
}

/**
 * Individual Line Item Interface
 * Represents a single item being requested
 */
export interface LineItem {
  /** Unique identifier for the line item */
  id: string;
  /** Description of the item */
  description: string;
  /** Quantity of the item being requested */
  quantity: number;
  /** Unit of measurement for the item */
  uom: string;
  /** Additional notes about the item */
  notes?: string;
  /** Supporting documents for the item */
  attachments: UploadedFile[];
}

/**
 * Vendor Quote Interface
 * Represents a quote received from a vendor
 */
export interface Quote {
  /** Unique identifier for the quote */
  id: string;
  /** Name of the vendor */
  vendorName: string;
  /** Vendor ID (if applicable) */
  vendor?: string;
  /** Total amount of the quote */
  amount: number;
  /** Currency of the quote */
  currency: string;
  /** Notes about the quote */
  notes: string;
  /** User who submitted the quote */
  submittedBy?: string;
  /** Timestamp when the quote was submitted */
  submittedAt?: string;
}

/**
 * User Interface
 * Represents a user in the system
 */
export interface User {
  /** Unique identifier for the user */
  id: string;
  /** Full name of the user */
  name: string;
  /** Email address of the user */
  email: string;
  /** Role of the user in the system */
  role: UserRole;
  /** Department the user belongs to (if applicable) */
  department?: string;
  /** Organization the user belongs to */
  organization: string;
  /** Whether the user is active */
  isActive: boolean;
  /** Approval limit for the user (if applicable) */
  approvalLimit?: number;
  /** Unique ID for the user (if applicable) */
  uid?: string;
}

/**
 * User Role Enum
 * Defines all possible roles a user can have
 */
export enum UserRole {
  /** Administrator role */
  ADMIN = 'ADMIN',
  /** Finance approver role */
  FINANCE_APPROVER = 'FINANCE_APPROVER',
  /** Procurement role */
  PROCUREMENT = 'PROCUREMENT',
  /** Standard user role */
  USER = 'USER',
  /** Approver role */
  APPROVER = 'APPROVER'
}

/**
 * Attachment Interface
 * Represents a file attached to a PR or line item
 */
export interface Attachment {
  /** Unique identifier for the attachment */
  id: string;
  /** Name of the attachment */
  name: string;
  /** URL of the attachment */
  url: string;
  /** Path of the attachment */
  path?: string;
  /** Type of the attachment */
  type: string;
  /** Size of the attachment */
  size: number;
  /** Timestamp when the attachment was uploaded */
  uploadedAt: string; 
  /** User who uploaded the attachment */
  uploadedBy: User;
}

/**
 * Approval Info Interface
 * Represents approval information for a PR
 */
export interface ApprovalInfo {
  /** User who approved the PR */
  approver: User;
  /** Timestamp when the PR was approved */
  approvedAt?: string;
  /** Notes about the approval */
  notes?: string;
  /** Status of the approval */
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
}

/**
 * PR Workflow Interface
 * Represents the workflow information for a PR
 */
export interface PRWorkflow {
  /** Current step in the workflow */
  currentStep: WorkflowStep;
  /** Adjudication information (if applicable) */
  adjudication?: AdjudicationInfo;
  /** Finance approval information (if applicable) */
  financeApproval?: ApprovalInfo;
  /** Procurement review information (if applicable) */
  procurementReview?: ApprovalInfo;
  /** History of workflow steps */
  history: WorkflowHistory[];
}

/**
 * Adjudication Info Interface
 * Represents adjudication information for a PR
 */
export interface AdjudicationInfo {
  /** Notes about the adjudication */
  notes: string;
  /** User who added the adjudication information */
  addedBy: User;
  /** Timestamp when the adjudication information was added */
  addedAt: string;
  /** Supporting documents for the adjudication */
  attachments?: Attachment[];
}

/**
 * Workflow History Interface
 * Represents a single step in the workflow history
 */
export interface WorkflowHistory {
  /** Step in the workflow */
  step: WorkflowStep;
  /** Timestamp when the step was taken */
  timestamp: string;
  /** User who took the step */
  user: User;
  /** Notes about the step */
  notes?: string;
}

/**
 * Workflow Step Enum
 * Defines all possible steps in the workflow
 */
export enum WorkflowStep {
  /** Initial state when PR is first created */
  SUBMITTED = 'SUBMITTED',
  /** PR is in procurement queue for processing */
  IN_QUEUE = 'IN_QUEUE',
  /** Adjudication is required for the PR */
  ADJUDICATION_REQUIRED = 'ADJUDICATION_REQUIRED',
  /** Adjudication is complete for the PR */
  ADJUDICATION_COMPLETE = 'ADJUDICATION_COMPLETE',
  /** Finance review is required for the PR */
  FINANCE_REVIEW = 'FINANCE_REVIEW',
  /** Procurement review is required for the PR */
  PROCUREMENT_REVIEW = 'PROCUREMENT_REVIEW',
  /** PR is ready for PO creation */
  READY_FOR_PO = 'READY_FOR_PO',
  /** PO has been created for the PR */
  PO_CREATED = 'PO_CREATED',
  /** PR has been fully processed and closed */
  COMPLETED = 'COMPLETED',
  /** PR has been rejected by approver */
  REJECTED = 'REJECTED'
}

/**
 * PR Metrics Interface
 * Represents performance and status metrics for a PR
 */
export interface PRMetrics {
  /** Number of days the PR has been open */
  daysOpen: number;
  /** Whether the PR needs urgent processing */
  isUrgent: boolean;
  /** Whether the PR is overdue */
  isOverdue: boolean;
  /** Whether quotes are required for the PR */
  quotesRequired: boolean;
  /** Whether adjudication is required for the PR */
  adjudicationRequired: boolean;
  /** Whether finance approval is required for the PR */
  financeApprovalRequired: boolean;
  /** Whether customs clearance is required for the PR */
  customsClearanceRequired: boolean;
  /** Expected delivery date for the PR */
  expectedDeliveryDate?: string;
  /** Expected landing date for the PR */
  expectedLandingDate?: string;
  /** Completion percentage for the PR */
  completionPercentage: number;
  /** Queue position for the PR */
  queuePosition?: number;
  /** Number of days since last resubmission */
  daysResubmission?: number;
  /** Number of days since PO was placed */
  daysOrdered?: number;
  /** Number of days the PR is overdue */
  daysOverdue?: number;
  /** Time to close the PR */
  timeToClose?: number;
}

/**
 * PR Amount Thresholds
 * Defines the thresholds for different approval levels
 */
export const PR_AMOUNT_THRESHOLDS = {
  /** Admin approval threshold */
  ADMIN_APPROVAL: 1000,     
  /** Quotes required threshold */
  QUOTES_REQUIRED: 5000,     
  /** Finance approval threshold */
  FINANCE_APPROVAL: 50000,   
  /** Adjudication required threshold */
  ADJUDICATION_REQUIRED: 100000
};
