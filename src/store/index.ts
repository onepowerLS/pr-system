/**
 * @fileoverview Redux Store Configuration
 * @version 1.2.0
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
import { persistStore, persistReducer } from 'redux-persist';
import storage from 'redux-persist/lib/storage';
import authReducer from './slices/authSlice';
import prReducer from './slices/prSlice';
import snackbarReducer from './slices/snackbarSlice';

console.log('=== Initializing Redux Store ===');

// Configure persistence
const authPersistConfig = {
  key: 'auth',
  storage,
  whitelist: ['user']
};

const prPersistConfig = {
  key: 'pr',
  storage,
  whitelist: ['userPRs', 'pendingApprovals']
};

const persistedAuthReducer = persistReducer(authPersistConfig, authReducer);
const persistedPrReducer = persistReducer(prPersistConfig, prReducer);

const store = configureStore({
  reducer: {
    auth: persistedAuthReducer,
    pr: persistedPrReducer,
    snackbar: snackbarReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore redux-persist actions
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE', 'auth/setUser'],
        // Ignore these field paths in all actions
        ignoredActionPaths: ['payload.createdAt', 'payload.updatedAt'],
        // Ignore these paths in the state
        ignoredPaths: [
          'auth.user',
          'pr.currentPR',
          '_persist'
        ],
      },
    }),
});

console.log('Redux store initialized successfully');

export const persistor = persistStore(store);

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export { store };
