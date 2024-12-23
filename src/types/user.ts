/**
 * @fileoverview User Type Definitions
 * @version 1.2.0
 * 
 * Description:
 * Defines the core user types and interfaces used throughout the application.
 */

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'FINANCE_APPROVER' | 'PROCUREMENT' | 'USER';
  department?: string;
  organization: string;  // Required field for organizational context
  isActive: boolean;
  approvalLimit?: number;
  createdAt?: any;      // Firestore Timestamp
  updatedAt?: any;      // Firestore Timestamp
}
