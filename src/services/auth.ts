/**
 * @fileoverview Authentication Service Implementation
 * @version 1.3.0
 * 
 * Change History:
 * 1.0.0 - Initial implementation of basic auth functions
 * 1.1.0 - Added error handling and user state management
 * 1.2.0 - Improved logging and error messages, refactored to individual exports
 * 1.3.0 - Updated auth service to handle both UID and email-based user lookups
 * 
 * Description:
 * This module provides authentication services for the PR System application.
 * It wraps Firebase Authentication functionality with application-specific
 * logic and error handling. Manages user authentication state and provides
 * methods for sign-in, sign-out, and user state management.
 * 
 * Architecture Notes:
 * - Uses Firebase Auth for authentication backend
 * - Integrates with Redux store for state management
 * - Provides error handling and logging for auth operations
 * - Exports individual functions for better tree-shaking
 * 
 * Related Modules:
 * - src/config/firebase.ts: Provides the auth instance
 * - src/store/slices/authSlice.ts: Manages auth state in Redux
 * - src/components/auth/LoginPage.tsx: Uses these functions for user login
 * 
 * Data Flow:
 * 1. User initiates auth action (e.g., login)
 * 2. Auth service calls Firebase Auth
 * 3. Updates Redux store with result
 * 4. UI components react to state changes
 */

import { 
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  User as FirebaseUser,
  AuthError,
  AuthErrorCodes,
  onAuthStateChanged,
  getIdToken,
  sendPasswordResetEmail
} from 'firebase/auth';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { User } from '../types/user';
import { store } from '../store';
import { setUser, clearUser, setLoading, setError } from '../store/slices/authSlice';

// Check if we're in development mode
const isDevelopment = import.meta.env.MODE === 'development';

let refreshTokenInterval: NodeJS.Timeout | null = null;

const startTokenRefresh = async (user: FirebaseUser) => {
  if (refreshTokenInterval) {
    clearInterval(refreshTokenInterval);
  }

  // Refresh token every 30 minutes
  refreshTokenInterval = setInterval(async () => {
    try {
      await getIdToken(user, true);
      console.log('auth.ts: Token refreshed successfully');
    } catch (error) {
      console.error('auth.ts: Token refresh failed:', error);
      // Force re-login if token refresh fails
      await signOut();
    }
  }, 30 * 60 * 1000);
};

export const signIn = async (email: string, password: string): Promise<void> => {
  console.log('auth.ts: Attempting sign in');
  try {
    store.dispatch(setLoading(true));
    store.dispatch(setError(null));

    // Sign in with Firebase
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    console.log('auth.ts: Firebase sign in successful');

    // Get user details from Firestore
    const userDetails = await getUserDetails(userCredential.user.uid);
    if (!userDetails) {
      console.error('auth.ts: User details not found in Firestore');
      throw new Error('User account not found');
    }

    // Start token refresh
    await startTokenRefresh(userCredential.user);

    // Update Redux store
    store.dispatch(setUser(userDetails));
    console.log('auth.ts: Sign in complete');
  } catch (error) {
    console.error('auth.ts: Sign in failed:', error);
    let errorMessage = 'Sign in failed';

    if (error instanceof Error) {
      const authError = error as AuthError;
      switch (authError.code) {
        case AuthErrorCodes.INVALID_PASSWORD:
          errorMessage = 'Invalid password';
          break;
        case AuthErrorCodes.USER_DELETED:
          errorMessage = 'Account not found';
          break;
        case AuthErrorCodes.TOO_MANY_ATTEMPTS_TRY_LATER:
          errorMessage = 'Too many attempts. Please try again later';
          break;
        default:
          errorMessage = authError.message;
      }
    }

    store.dispatch(setError(errorMessage));
    throw error;
  } finally {
    store.dispatch(setLoading(false));
  }
};

export const signOut = async (): Promise<void> => {
  try {
    await firebaseSignOut(auth);
    if (refreshTokenInterval) {
      clearInterval(refreshTokenInterval);
      refreshTokenInterval = null;
    }
    store.dispatch(clearUser());
    console.log('auth.ts: Sign out successful');
  } catch (error) {
    console.error('auth.ts: Sign out failed:', error);
    throw error;
  }
};

export const getUserDetails = async (uid: string): Promise<User | null> => {
  console.log('auth.ts: Getting user details for:', uid);
  try {
    // First try to get user by UID
    const userDocRef = doc(db, 'users', uid);
    let userDoc = await getDoc(userDocRef);

    // If not found by UID, try to find by email
    if (!userDoc.exists()) {
      console.log('auth.ts: User not found by UID, checking email...');
      const user = auth.currentUser;
      if (user?.email) {
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('email', '==', user.email));
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
          userDoc = querySnapshot.docs[0];
          console.log('auth.ts: User found by email');
        } else {
          console.log('auth.ts: User not found by email either');
          return null;
        }
      }
    }

    const userData = userDoc.data() as Omit<User, 'id'>;
    return {
      id: uid,
      ...userData,
      // Set default values for required fields if they don't exist
      role: userData.role || 'USER',
      permissionLevel: userData.permissionLevel || 4,
      isActive: userData.isActive ?? true,
      name: userData.name || '',
      organization: userData.organization || {
        id: 'default',
        name: 'Default Organization',
        isActive: true
      }
    };
  } catch (error) {
    console.error('auth.ts: Get user details failed:', error);
    throw error;
  }
};

export const getCurrentUser = async (): Promise<User | null> => {
  const user = auth.currentUser;
  if (!user) {
    return null;
  }
  return getUserDetails(user.uid);
};

export const initializeAuthListener = (): void => {
  onAuthStateChanged(auth, async (user) => {
    try {
      if (user) {
        const userDetails = await getUserDetails(user.uid);
        if (userDetails) {
          store.dispatch(setUser(userDetails));
          await startTokenRefresh(user);
        } else {
          store.dispatch(setError('User account not found'));
          await signOut();
        }
      } else {
        store.dispatch(clearUser());
      }
    } catch (error) {
      console.error('auth.ts: Auth state change error:', error);
      store.dispatch(setError('Authentication error'));
    }
  });
};

export const resetPassword = async (email: string): Promise<void> => {
  console.log('auth.ts: Attempting password reset');
  try {
    store.dispatch(setLoading(true));
    store.dispatch(setError(null));

    await sendPasswordResetEmail(auth, email);
    console.log('auth.ts: Password reset email sent');
  } catch (error) {
    console.error('auth.ts: Password reset failed:', error);
    let errorMessage = 'Password reset failed';

    if (error instanceof Error) {
      const authError = error as AuthError;
      switch (authError.code) {
        case AuthErrorCodes.USER_DELETED:
          errorMessage = 'Account not found';
          break;
        case AuthErrorCodes.INVALID_EMAIL:
          errorMessage = 'Invalid email address';
          break;
        default:
          errorMessage = authError.message;
      }
    }

    store.dispatch(setError(errorMessage));
    throw error;
  } finally {
    store.dispatch(setLoading(false));
  }
};
