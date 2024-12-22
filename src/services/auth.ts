import { 
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { User } from '../types/pr';

export const authService = {
  login: async (email: string, password: string) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      return userCredential.user;
    } catch (error) {
      console.error('Login error:', error);
      throw new Error('Invalid email or password');
    }
  },

  logout: async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  },

  getCurrentUser: () => {
    return new Promise<FirebaseUser | null>((resolve, reject) => {
      const unsubscribe = onAuthStateChanged(
        auth,
        (user) => {
          unsubscribe();
          resolve(user);
        },
        reject
      );
    });
  },

  getUserDetails: async (userId: string): Promise<User | null> => {
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (!userDoc.exists()) {
        console.error('No user document found for ID:', userId);
        throw new Error('User account not properly set up. Please contact support.');
      }
      
      const userData = userDoc.data();
      if (!userData.active) {
        throw new Error('User account is inactive. Please contact support.');
      }

      return {
        id: userId,
        email: userData.email,
        name: userData.name,
        department: userData.department,
        role: userData.role,
        active: userData.active
      };
    } catch (error) {
      console.error('Error fetching user details:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to load user details. Please try again later.');
    }
  }
};
