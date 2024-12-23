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
  User as FirebaseUser
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { User } from '../types/user';
import { store } from '../store';
import { setUser, clearUser, setLoading, setError } from '../store/slices/authSlice';

/**
 * Signs in a user with email and password
 * @param email - User's email address
 * @param password - User's password
 * @returns Promise resolving to the signed-in user
 * @throws Error if sign-in fails
 */
export const signIn = async (email: string, password: string): Promise<void> => {
  console.log('auth.ts: Attempting sign in');
  try {
    store.dispatch(setLoading(true));
    store.dispatch(setError(null));

    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
    
    if (!userDoc.exists()) {
      throw new Error('User account not found. Please contact support.');
    }

    const userData = userDoc.data() as Omit<User, 'id'>;
    const user: User = {
      id: userCredential.user.uid,
      ...userData
    };

    store.dispatch(setUser(user));
    console.log('auth.ts: Sign in successful');
  } catch (error) {
    console.error('auth.ts: Sign in failed:', error);
    let errorMessage = 'Failed to sign in';
    
    if (error instanceof Error) {
      // Handle specific Firebase Auth errors
      switch (error.message) {
        case 'auth/user-not-found':
          errorMessage = 'No account found with this email';
          break;
        case 'auth/wrong-password':
          errorMessage = 'Incorrect password';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Invalid email address';
          break;
        case 'auth/user-disabled':
          errorMessage = 'This account has been disabled';
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

/**
 * Signs out the current user
 * @returns Promise<void>
 * @throws Error if sign-out fails
 */
export const signOut = async (): Promise<void> => {
  console.log('auth.ts: Attempting sign out');
  try {
    await firebaseSignOut(auth);
    store.dispatch(clearUser());
    console.log('auth.ts: Sign out successful');
  } catch (error) {
    console.error('auth.ts: Sign out failed:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to sign out';
    store.dispatch(setError(errorMessage));
    throw new Error(errorMessage);
  }
};

/**
 * Retrieves user details from Firestore
 * @param uid - User's unique ID
 * @returns Promise resolving to the user details or null if not found
 */
export const getUserDetails = async (uid: string): Promise<User | null> => {
  console.log('auth.ts: Getting user details for:', uid);
  try {
    const userDoc = await getDoc(doc(db, 'users', uid));
    
    if (!userDoc.exists()) {
      console.error('auth.ts: No user document found for:', uid);
      return null;
    }

    const userData = userDoc.data() as Omit<User, 'id'>;
    return {
      id: uid,
      ...userData
    };
  } catch (error) {
    console.error('auth.ts: Failed to get user details:', error);
    throw error;
  }
};

/**
 * Retrieves the current user's details
 * @returns Promise resolving to the current user or null if not signed in
 */
export const getCurrentUser = async (): Promise<User | null> => {
  console.log('auth.ts: Getting current user');
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      console.log('auth.ts: No current user found');
      return null;
    }

    const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
    if (!userDoc.exists()) {
      console.error('auth.ts: User document not found');
      return null;
    }

    const userData = userDoc.data() as Omit<User, 'id'>;
    return {
      id: currentUser.uid,
      ...userData
    };
  } catch (error) {
    console.error('auth.ts: Error getting current user:', error);
    return null;
  }
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
        const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
        if (!userDoc.exists()) {
          throw new Error('User document not found');
        }

        const userData = userDoc.data() as Omit<User, 'id'>;
        const user: User = {
          id: firebaseUser.uid,
          ...userData
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
