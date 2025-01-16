/**
 * @fileoverview Authentication Service Implementation
 * @version 1.2.0
 * 
 * Change History:
 * 1.0.0 - Initial implementation of basic auth functions
 * 1.1.0 - Added error handling and user state management
 * 1.2.0 - Improved logging and error messages, refactored to individual exports
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
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { User } from '../types/user';
import { store } from '../store';
import { setUser, clearUser, setLoading, setError } from '../store/slices/authSlice';

// Function to check Firebase connectivity
// const checkFirebaseConnectivity = async (): Promise<boolean> => {
//   try {
//     const response = await fetch('https://firebase.googleapis.com/v1/projects/_/installations', {
//       method: 'HEAD'
//     });
//     return response.ok;
//   } catch (error) {
//     console.error('auth.ts: Firebase connectivity check failed:', error);
//     return false;
//   }
// };

// Check if we're in development mode
const isDevelopment = import.meta.env.MODE === 'development';

// Function to check Firebase connectivity
// const checkFirebaseConnectivity = async (): Promise<boolean> => {
//   try {
//     const response = await fetch('https://www.googleapis.com/identitytoolkit/v3/relyingparty/getAccountInfo');
//     return response.status !== 0; // If status is 0, there's no connectivity
//   } catch (error) {
//     console.error('auth.ts: Firebase connectivity check failed:', error);
//     return false;
//   }
// };

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

    // Clear any existing token refresh
    if (refreshTokenInterval) {
      clearInterval(refreshTokenInterval);
      refreshTokenInterval = null;
    }

    console.log('auth.ts: Calling Firebase signInWithEmailAndPassword');
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    console.log('auth.ts: Firebase sign in successful, getting user document');
    
    // Start token refresh
    await startTokenRefresh(userCredential.user);
    
    // Look up user by email instead of UID
    const userDoc = await getDoc(doc(db, 'users', email));
    console.log('auth.ts: User document exists:', userDoc.exists());
    
    if (!userDoc.exists()) {
      throw new Error('User account not found. Please contact support.');
    }

    const userData = userDoc.data() as Omit<User, 'id'>;
    console.log('auth.ts: User data:', JSON.stringify(userData, null, 2));
    
    const user: User = {
      id: email,
      ...userData,
      // Set default values for required fields if they don't exist
      role: userData.role || 'USER',
      permissionLevel: userData.permissionLevel || 4,
      isActive: userData.isActive ?? true,
      name: userData.name || email.split('@')[0],
      organization: userData.organization || {
        id: 'default',
        name: 'Default Organization',
        isActive: true
      }
    };

    console.log('auth.ts: Final user object:', JSON.stringify(user, null, 2));
    store.dispatch(setUser(user));
    console.log('auth.ts: Sign in successful');
  } catch (error) {
    console.error('auth.ts: Sign in failed:', error);
    console.error('auth.ts: Error type:', error instanceof Error ? 'Error' : typeof error);
    console.error('auth.ts: Error code:', error instanceof Error ? (error as any).code : 'no code');
    console.error('auth.ts: Error message:', error instanceof Error ? error.message : error);
    
    let errorMessage = 'Failed to sign in';
    
    if (error instanceof Error) {
      const authError = error as AuthError;
      // Handle specific Firebase Auth errors
      switch (authError.code) {
        case AuthErrorCodes.USER_DELETED:
          errorMessage = 'No account found with this email';
          break;
        case AuthErrorCodes.INVALID_PASSWORD:
          errorMessage = 'Incorrect password';
          break;
        case AuthErrorCodes.INVALID_EMAIL:
          errorMessage = 'Invalid email address';
          break;
        case AuthErrorCodes.USER_DISABLED:
          errorMessage = 'This account has been disabled';
          break;
        case AuthErrorCodes.INVALID_LOGIN_CREDENTIALS:
          errorMessage = 'Invalid email or password';
          break;
        case AuthErrorCodes.NETWORK_REQUEST_FAILED:
          errorMessage = 'Network error. Please check your internet connection and try again.';
          break;
        default:
          errorMessage = error.message;
      }
    }
    
    console.error('auth.ts: Final error message:', errorMessage);
    store.dispatch(setError(errorMessage));
    throw new Error(errorMessage);
  } finally {
    store.dispatch(setLoading(false));
  }
};

/**
 * Signs out the current user
 * @returns Promise<void>
 * @throws Error if sign-out fails
 */
export const signOut = async (): Promise<void> => {
  try {
    // Clear token refresh
    if (refreshTokenInterval) {
      clearInterval(refreshTokenInterval);
      refreshTokenInterval = null;
    }

    await firebaseSignOut(auth);
    store.dispatch(clearUser());
  } catch (error) {
    console.error('auth.ts: Sign out failed:', error);
    throw error;
  }
};

/**
 * Retrieves user details from Firestore
 * @param email - User's email address
 * @returns Promise resolving to the user details or null if not found
 */
export const getUserDetails = async (email: string): Promise<User | null> => {
  try {
    const userDoc = await getDoc(doc(db, 'users', email));
    if (!userDoc.exists()) {
      return null;
    }

    const userData = userDoc.data() as Omit<User, 'id'>;
    return {
      id: email,
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

/**
 * Retrieves the current user's details
 * @returns Promise resolving to the current user or null if not signed in
 */
export const getCurrentUser = async (): Promise<User | null> => {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    return null;
  }

  return getUserDetails(currentUser.email as string);
};

/**
 * Initializes the authentication listener
 */
export const initializeAuthListener = (): void => {
  console.log('auth.ts: Initializing auth listener');
  onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
    console.log('auth.ts: Auth state changed', { userPresent: !!firebaseUser });
    store.dispatch(setLoading(true));
    
    try {
      if (firebaseUser) {
        const userDoc = await getDoc(doc(db, 'users', firebaseUser.email as string));
        if (!userDoc.exists()) {
          throw new Error('User document not found');
        }

        const userData = userDoc.data() as Omit<User, 'id'>;
        const user: User = {
          id: firebaseUser.email as string,
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

        store.dispatch(setUser(user));
      } else {
        store.dispatch(clearUser());
      }
    } catch (error) {
      console.error('auth.ts: Error in auth listener:', error);
      store.dispatch(setError(error instanceof Error ? error.message : 'Authentication error'));
    } finally {
      store.dispatch(setLoading(false));
    }
  });
};

/**
 * Resets the password for the given email
 * @param email - User's email address
 * @returns Promise<void>
 * @throws Error if password reset fails
 */
export const resetPassword = async (email: string): Promise<void> => {
  console.log('auth.ts: Attempting password reset for:', email);
  try {
    store.dispatch(setLoading(true));
    store.dispatch(setError(null));

    await sendPasswordResetEmail(auth, email);
    console.log('auth.ts: Password reset email sent successfully');
  } catch (error) {
    console.error('auth.ts: Password reset failed:', error);
    let errorMessage = 'Failed to send password reset email';
    
    if (error instanceof Error) {
      const authError = error as AuthError;
      switch (authError.code) {
        case AuthErrorCodes.USER_DELETED:
          errorMessage = 'No account found with this email';
          break;
        case AuthErrorCodes.INVALID_EMAIL:
          errorMessage = 'Invalid email address';
          break;
        case AuthErrorCodes.NETWORK_REQUEST_FAILED:
          errorMessage = 'Network error. Please check your internet connection and try again.';
          break;
        default:
          errorMessage = error.message;
      }
    }
    
    store.dispatch(setError(errorMessage));
    throw new Error(errorMessage);
  } finally {
    store.dispatch(setLoading(false));
  }
};
