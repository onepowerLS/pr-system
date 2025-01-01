/**
 * @fileoverview User Type Definitions
 * @version 1.2.0
 * 
 * Description:
 * Type definitions for user-related data in the PR System. These types define
 * user profiles, permissions, and role-based access control.
 * 
 * User Roles:
 * - ADMIN: Full system access
 * - FINANCE_APPROVER: Can approve high-value PRs
 * - PROCUREMENT: Can process and manage PRs
 * - USER: Can create and view PRs
 * 
 * Related Modules:
 * - src/services/auth.ts: Authentication service
 * - src/hooks/useAuth.ts: Auth hook
 * - src/components/auth/*: Auth UI components
 */

import { Organization } from './organization';

/**
 * User Profile Interface
 * Core user data structure
 */
export interface User {
  /** Unique identifier */
  id: string;
  /** User's full name */
  name: string;
  /** Email address */
  email: string;
  /** User's role */
  role: UserRole;
  /** Associated organization */
  organization: Organization;
  /** User's department */
  department?: string;
  /** Whether user is active */
  isActive: boolean;
  /** Last login timestamp */
  lastLogin?: string;
  /** User preferences */
  preferences?: UserPreferences;
  /** Approval limit */
  approvalLimit?: number;
  /** Created at timestamp */
  createdAt?: any;      // Firestore Timestamp
  /** Updated at timestamp */
  updatedAt?: any;      // Firestore Timestamp
}

/**
 * User Role Enum
 * Defines possible user roles and their hierarchy
 */
export enum UserRole {
  /** Full system access */
  ADMIN = 'ADMIN',
  /** Can approve high-value PRs */
  FINANCE_APPROVER = 'FINANCE_APPROVER',
  /** Can process PRs */
  PROCUREMENT = 'PROCUREMENT',
  /** Can approve PRs */
  APPROVER = 'APPROVER',
  /** Basic access */
  USER = 'USER'
}

/**
 * User Permissions Interface
 * Defines what actions a user can perform
 */
export interface UserPermissions {
  /** Can create PRs */
  canCreatePR: boolean;
  /** Can approve PRs */
  canApprovePR: boolean;
  /** Maximum approval amount */
  approvalLimit?: number;
  /** Can process PRs */
  canProcessPR: boolean;
  /** Can manage users */
  canManageUsers: boolean;
  /** Can view reports */
  canViewReports: boolean;
}

/**
 * User Preferences Interface
 * User-specific settings
 */
export interface UserPreferences {
  /** Email notification settings */
  notifications: {
    /** PR status changes */
    prStatusChanges: boolean;
    /** New PRs to approve */
    newApprovals: boolean;
    /** Daily summaries */
    dailySummary: boolean;
  };
  /** UI theme preference */
  theme: 'light' | 'dark';
  /** Default currency */
  defaultCurrency: string;
  /** Items per page in lists */
  pageSize: number;
}
