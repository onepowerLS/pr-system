import { 
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { User } from '../types/user';
import { store } from '../store';
import { setUser, clearUser, setLoading, setError } from '../store/slices/authSlice';

export const signIn = async (email: string, password: string): Promise<void> => {
  console.log('auth.ts: Attempting sign in');
  try {
    setLoading(true);
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
    
    if (!userDoc.exists()) {
      throw new Error('User document not found');
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
    store.dispatch(setError(error instanceof Error ? error.message : 'Failed to sign in'));
    throw error;
  } finally {
    store.dispatch(setLoading(false));
  }
};

export const signOut = async (): Promise<void> => {
  console.log('auth.ts: Attempting sign out');
  try {
    await firebaseSignOut(auth);
    store.dispatch(clearUser());
    console.log('auth.ts: Sign out successful');
  } catch (error) {
    console.error('auth.ts: Sign out failed:', error);
    store.dispatch(setError(error instanceof Error ? error.message : 'Failed to sign out'));
    throw error;
  }
};

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
