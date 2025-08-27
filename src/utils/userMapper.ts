/**
 * @fileoverview User Mapper Utility
 * @version 1.0.0
 * 
 * Description:
 * Utility functions for mapping between Firebase Auth User and application User types.
 */

import { User as FirebaseUser } from 'firebase/auth';
import { User, UserRole } from '../types/user';
import { UserReference } from '../types/pr';

/**
 * Maps a Firebase Auth User to a UserReference
 * @param firebaseUser Firebase Auth User
 * @returns UserReference object
 */
export function mapFirebaseUserToUserReference(firebaseUser: FirebaseUser | null): UserReference | null {
  if (!firebaseUser) return null;
  
  return {
    id: firebaseUser.uid,
    email: firebaseUser.email || '',
    name: firebaseUser.displayName || '',
    isActive: true
  };
}

/**
 * Maps a Firebase Auth User to a partial User object
 * Used when we only have Firebase Auth data but need to work with our User interface
 * @param firebaseUser Firebase Auth User
 * @returns Partial User object
 */
export function mapFirebaseUserToPartialUser(firebaseUser: FirebaseUser | null): Partial<User> | null {
  if (!firebaseUser) return null;
  
  const nameParts = (firebaseUser.displayName || '').split(' ');
  const firstName = nameParts[0] || '';
  const lastName = nameParts.slice(1).join(' ') || '';
  
  return {
    id: firebaseUser.uid,
    email: firebaseUser.email || '',
    firstName,
    lastName,
    name: firebaseUser.displayName || '',
    isActive: true
  };
}
