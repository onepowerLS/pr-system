import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import prReducer from './slices/prSlice';
import snackbarReducer from './slices/snackbarSlice';

console.log('=== Initializing Redux Store ===');

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

  console.log('Redux store initialized successfully');

  // Subscribe to store changes
  store.subscribe(() => {
    try {
      const state = store.getState();
      const { auth } = state;
      
      console.log('=== Store State Updated ===');
      console.log('Auth State:', {
        loading: auth.loading,
        error: auth.error,
        isAuthenticated: !!auth.user,
        user: auth.user ? {
          id: auth.user.id,
          email: auth.user.email,
          role: auth.user.role,
        } : null,
      });
      
      // Log action that caused the update
      const action = store.getState().__lastAction;
      if (action) {
        console.log('Last Action:', {
          type: action.type,
          payload: action.payload,
        });
      }
    } catch (error) {
      console.error('Error in store subscription:', error);
    }
  });
} catch (error) {
  console.error('Failed to initialize Redux store:', error);
  throw error;
}

// Define RootState type from store
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export { store };
