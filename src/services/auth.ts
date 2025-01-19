/**
 * @fileoverview Authentication Service Implementation
 * @version 1.3.1
 * 
 * Change History:
 * 1.0.0 - Initial implementation of basic auth functions
 * 1.1.0 - Added error handling and user state management
 * 1.2.0 - Improved logging and error messages, refactored to individual exports
 * 1.3.0 - Updated auth service to handle both UID and email-based user lookups
 * 1.3.1 - Updated auth service to normalize organization IDs
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
  AuthErrorCodes,
  onAuthStateChanged,
  getIdToken,
  sendPasswordResetEmail,
  getAuth,
  User as FirebaseUser,
  AuthError
} from 'firebase/auth';

import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  setDoc
} from 'firebase/firestore';

import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../config/firebase';
import { User } from '../types/user';
import { store } from '../store';
import { setUser, clearUser, setLoading, setError } from '../store/slices/authSlice';
import { normalizeOrganizationId } from '@/utils/organization';

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
    const userCredential = await signInWithEmailAndPassword(getAuth(), email, password);
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
    await firebaseSignOut(getAuth());
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

export const getUserDetails = async (uid: string): Promise<User> => {
  try {
    const userDoc = await getDoc(doc(db, 'users', uid));
    if (!userDoc.exists()) {
      throw new Error('User not found');
    }
    const userData = userDoc.data();
    
    // If the user's organization is 'Codeium', update it to a default organization
    if (userData.organization === 'Codeium') {
      console.log('Found default organization, updating to 1PWR LESOTHO');
      // Update the user's organization in Firestore
      await updateDoc(doc(db, 'users', uid), {
        organization: '1PWR LESOTHO',
        updatedAt: new Date().toISOString()
      });
      userData.organization = '1PWR LESOTHO';
    }
    
    return {
      id: uid,
      email: userData.email,
      firstName: userData.firstName,
      lastName: userData.lastName,
      role: userData.role,
      organization: userData.organization,
      isActive: userData.isActive,
      permissionLevel: userData.permissionLevel,
      additionalOrganizations: userData.additionalOrganizations || []
    };
  } catch (error) {
    console.error('Error fetching user details:', error);
    throw error;
  }
};

export const getCurrentUser = async (): Promise<User | null> => {
  const user = getAuth().currentUser;
  if (!user) {
    return null;
  }
  return getUserDetails(user.uid);
};

export const initializeAuthListener = (): void => {
  onAuthStateChanged(getAuth(), async (user) => {
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

    await sendPasswordResetEmail(getAuth(), email);
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

/**
 * Updates a user's email address in both Firebase Auth and Firestore
 * @param userId - The user's ID
 * @param newEmail - The new email address
 */
export const updateUserEmail = async (userId: string, newEmail: string): Promise<void> => {
  try {
    // First, get the user from Firebase Auth
    const userRecord = await getAuth().getUser(userId);
    
    // Update email in Firebase Auth
    await getAuth().updateUser(userId, {
      email: newEmail,
    });

    // Update email in Firestore
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      email: newEmail,
      updatedAt: new Date().toISOString()
    });

    console.log(`Successfully updated email for user ${userId} to ${newEmail}`);
  } catch (error) {
    console.error('Error updating user email:', error);
    throw error;
  }
};

/**
 * Updates a user's password in Firebase Auth
 * @param userId The user's ID
 * @param email The user's email
 * @param newPassword The new password to set
 * @returns A promise that resolves with the result of the operation
 */
export async function updateUserPassword(userId: string, email: string, newPassword: string) {
  try {
    const updatePasswordFunction = httpsCallable(functions, 'updateUserPassword');
    return await updatePasswordFunction({
      userId,
      email,
      newPassword
    });
  } catch (error) {
    console.error('Error updating password:', error);
    throw error;
  }
}

/**
 * Creates a new user in both Firebase Auth and Firestore
 */
export const createUser = async (userData: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: string;
  organization: string;
  permissionLevel: number;
}): Promise<User> => {
  try {
    // First create the user in Firebase Auth
    const userRecord = await getAuth().createUser({
      email: userData.email,
      password: userData.password,
      displayName: `${userData.firstName} ${userData.lastName}`
    });

    // Then create the user document in Firestore
    const userDoc = {
      id: userRecord.uid,
      email: userData.email,
      firstName: userData.firstName,
      lastName: userData.lastName,
      role: userData.role,
      organization: userData.organization,
      isActive: true,
      permissionLevel: userData.permissionLevel,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await setDoc(doc(db, 'users', userRecord.uid), userDoc);

    return userDoc;
  } catch (error) {
    console.error('Error creating user:', error);
    throw error;
  }
};
