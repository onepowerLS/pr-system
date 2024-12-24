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
