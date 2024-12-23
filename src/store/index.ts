import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import prReducer from './slices/prSlice';
import snackbarReducer from './slices/snackbarSlice';

console.log('store/index.ts: Initializing Redux store');

let store: ReturnType<typeof configureStore>;

try {
  store = configureStore({
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

  console.log('store/index.ts: Redux store initialized successfully');

  // Subscribe to store changes
  store.subscribe(() => {
    try {
      const state = store.getState();
      console.log('store/index.ts: Store state updated:', {
        auth: {
          loading: state.auth.loading,
          error: state.auth.error,
          userPresent: !!state.auth.user,
        },
        snackbar: {
          message: state.snackbar.message,
          severity: state.snackbar.severity,
        },
      });
    } catch (error) {
      console.error('store/index.ts: Error in store subscription:', error);
    }
  });
} catch (error) {
  console.error('store/index.ts: Failed to initialize Redux store:', error);
  throw new Error(`Failed to initialize application state: ${error instanceof Error ? error.message : 'Unknown error'}`);
}

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
export { store };
