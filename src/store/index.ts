/**
 * @fileoverview Redux Store Configuration
 * @version 1.1.0
 * 
 * Description:
 * Central Redux store configuration for the PR System. Combines multiple reducers
 * and configures middleware for state management.
 * 
 * Store Structure:
 * - auth: Authentication state and user data
 * - pr: Purchase request data and UI state
 * - snackbar: Global notification state
 * 
 * Middleware Configuration:
 * - Serialization checks disabled for specific paths
 * - Custom error handling
 * - Development tools integration
 * 
 * Related Modules:
 * - src/store/slices/*: Individual state slices
 * - src/hooks/*: Custom hooks using store
 * - src/components/*: UI components consuming store
 * 
 * Usage:
 * ```typescript
 * import { useSelector, useDispatch } from 'react-redux';
 * import { RootState, AppDispatch } from './store';
 * 
 * // In components:
 * const auth = useSelector((state: RootState) => state.auth);
 * const dispatch = useDispatch<AppDispatch>();
 * ```
 */

import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import prReducer from './slices/prSlice';
import snackbarReducer from './slices/snackbarSlice';

console.log('=== Initializing Redux Store ===');

const store = configureStore({
  reducer: {
    auth: authReducer,
    pr: prReducer,
    snackbar: snackbarReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore these action types
        ignoredActions: ['auth/setUser'],
        // Ignore these field paths in all actions
        ignoredActionPaths: ['payload.createdAt', 'payload.updatedAt'],
        // Ignore these paths in the state
        ignoredPaths: ['auth.user', 'pr.currentPR'],
      },
    }),
});

console.log('Redux store initialized successfully');

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export { store };
