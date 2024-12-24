/**
 * @fileoverview Authentication Redux Slice
 * @version 1.2.0
 * 
 * Change History:
 * 1.0.0 - Initial implementation with basic auth state
 * 1.1.0 - Added loading and error states
 * 1.2.0 - Improved type safety and added state logging
 * 
 * Description:
 * This module defines the Redux slice for authentication state management.
 * It handles user authentication state, loading states, and error messages
 * for the authentication flow in the PR System application.
 * 
 * Architecture Notes:
 * - Part of the Redux store architecture
 * - Manages global authentication state
 * - Provides actions for auth state updates
 * - Implements type-safe state management
 * 
 * Related Modules:
 * - src/services/auth.ts: Dispatches these actions
 * - src/components/auth/LoginPage.tsx: Consumes auth state
 * - src/components/common/PrivateRoute.tsx: Uses auth state for routing
 * 
 * State Structure:
 * {
 *   user: User | null;      // Current authenticated user
 *   loading: boolean;       // Authentication operation in progress
 *   error: string | null;   // Last authentication error
 * }
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { User } from '../../types/user';

// Define the shape of our authentication state
interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
}

// Initial state when the application loads
const initialState: AuthState = {
  user: null,
  loading: true,  // Start with loading true
  error: null,
};

// Create the auth slice with reducers
const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setUser(state, action: PayloadAction<User | null>) {
      state.user = action.payload;
      state.error = null;
      console.log('Auth: User state updated:', action.payload ? 'User set' : 'User cleared');
    },
    setLoading(state, action: PayloadAction<boolean>) {
      state.loading = action.payload;
      console.log('Auth: Loading state updated:', action.payload);
    },
    setError(state, action: PayloadAction<string | null>) {
      state.error = action.payload;
      console.log('Auth: Error state updated:', action.payload);
    },
    clearUser(state) {
      state.user = null;
      state.error = null;
      console.log('Auth: User state cleared');
    },
  },
});

// Export actions for use in components and services
export const { setUser, setLoading, setError, clearUser } = authSlice.actions;

// Export reducer for store configuration
export default authSlice.reducer;

// Export type for use in components
export type { AuthState };
