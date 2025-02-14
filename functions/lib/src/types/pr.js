"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.PR_AMOUNT_THRESHOLDS = exports.WorkflowStep = exports.UserRole = exports.PRStatus = void 0;
/**
 * Purchase Request Status Enum
 * Defines all possible states a PR can be in
 */
var PRStatus;
(function (PRStatus) {
    /** Initial state when PR is first created */
    PRStatus["SUBMITTED"] = "SUBMITTED";
    /** PR has been resubmitted after revision */
    PRStatus["RESUBMITTED"] = "RESUBMITTED";
    /** PR is in procurement queue for processing */
    PRStatus["IN_QUEUE"] = "IN_QUEUE";
    /** Awaiting approval from designated approvers */
    PRStatus["PENDING_APPROVAL"] = "PENDING_APPROVAL";
    /** PR has been approved and is ready for processing */
    PRStatus["APPROVED"] = "APPROVED";
    /** Purchase order has been placed */
    PRStatus["ORDERED"] = "ORDERED";
    /** Some items have been received */
    PRStatus["PARTIALLY_RECEIVED"] = "PARTIALLY_RECEIVED";
    /** PR has been fully processed and closed */
    PRStatus["COMPLETED"] = "COMPLETED";
    /** Changes requested by approver */
    PRStatus["REVISION_REQUIRED"] = "REVISION_REQUIRED";
    /** PR has been canceled by requestor or admin */
    PRStatus["CANCELED"] = "CANCELED";
    /** PR has been rejected by approver */
    PRStatus["REJECTED"] = "REJECTED";
})(PRStatus || (exports.PRStatus = PRStatus = {}));
/**
 * User Role Enum
 * Defines all possible roles a user can have
 */
var UserRole;
(function (UserRole) {
    /** Administrator role */
    UserRole["ADMIN"] = "ADMIN";
    /** Finance approver role */
    UserRole["FINANCE_APPROVER"] = "FINANCE_APPROVER";
    /** Procurement role */
    UserRole["PROCUREMENT"] = "PROCUREMENT";
    /** Standard user role */
    UserRole["USER"] = "USER";
    /** Approver role */
    UserRole["APPROVER"] = "APPROVER";
})(UserRole || (exports.UserRole = UserRole = {}));
/**
 * Workflow Step Enum
 * Defines all possible steps in the workflow
 */
var WorkflowStep;
(function (WorkflowStep) {
    /** Initial state when PR is first created */
    WorkflowStep["SUBMITTED"] = "SUBMITTED";
    /** PR is in procurement queue for processing */
    WorkflowStep["IN_QUEUE"] = "IN_QUEUE";
    /** Adjudication is required for the PR */
    WorkflowStep["ADJUDICATION_REQUIRED"] = "ADJUDICATION_REQUIRED";
    /** Adjudication is complete for the PR */
    WorkflowStep["ADJUDICATION_COMPLETE"] = "ADJUDICATION_COMPLETE";
    /** Finance review is required for the PR */
    WorkflowStep["FINANCE_REVIEW"] = "FINANCE_REVIEW";
    /** Procurement review is required for the PR */
    WorkflowStep["PROCUREMENT_REVIEW"] = "PROCUREMENT_REVIEW";
    /** PR is ready for PO creation */
    WorkflowStep["READY_FOR_PO"] = "READY_FOR_PO";
    /** PO has been created for the PR */
    WorkflowStep["PO_CREATED"] = "PO_CREATED";
    /** PR has been fully processed and closed */
    WorkflowStep["COMPLETED"] = "COMPLETED";
    /** PR has been rejected by approver */
    WorkflowStep["REJECTED"] = "REJECTED";
})(WorkflowStep || (exports.WorkflowStep = WorkflowStep = {}));
/**
 * PR Amount Thresholds
 * Defines the thresholds for different approval levels
 */
exports.PR_AMOUNT_THRESHOLDS = {
    /** Admin approval threshold */
    ADMIN_APPROVAL: 1000,
    /** Quotes required threshold */
    QUOTES_REQUIRED: 5000,
    /** Finance approval threshold */
    FINANCE_APPROVAL: 50000,
    /** Adjudication required threshold */
    ADJUDICATION_REQUIRED: 100000
};
//# sourceMappingURL=pr.js.map