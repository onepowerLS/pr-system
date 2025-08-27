/**
 * @fileoverview Redux Store Types
 * @version 1.0.0
 * 
 * Description:
 * Type definitions for the Redux store state and actions.
 * Provides TypeScript type safety for the store.
 * 
 * Related Modules:
 * - src/store/index.ts: Store configuration
 * - src/store/slices/*: Redux slices
 */

import { User } from './slices/authSlice';
import { PRRequest } from '../types/pr';

/**
 * Root State Type
 * Represents the complete Redux store state
 */
export interface RootState {
  auth: {
    user: User | null;
    loading: boolean;
    error: string | null;
  };
  pr: {
    userPRs: PRRequest[];
    pendingApprovals: PRRequest[];
    currentPR: PRRequest | null;
    loading: boolean;
    error: string | null;
  };
  snackbar: {
    open: boolean;
    message: string;
    severity: 'success' | 'info' | 'warning' | 'error';
  };
}
