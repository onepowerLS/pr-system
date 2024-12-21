import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import prReducer from './slices/prSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    pr: prReducer,
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

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
