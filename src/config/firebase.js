/**
 * @fileoverview Firebase Configuration and Service Initialization
 * @version 1.2.0
 *
 * Change History:
 * 1.0.0 - Initial Firebase setup with basic services
 * 1.1.0 - Added emulator support and enhanced error handling
 * 1.2.0 - Improved logging and removed emulator config for production stability
 *
 * Description:
 * This module initializes and exports Firebase services for the PR System application.
 * It serves as the central configuration point for all Firebase-related services
 * including Authentication, Firestore, Storage, Functions, and Analytics.
 *
 * Architecture Notes:
 * - Acts as a singleton for Firebase service instances
 * - Provides centralized error handling for initialization failures
 * - Validates environment variables before initialization
 * - Exports initialized services for use throughout the application
 *
 * Related Modules:
 * - src/services/auth.ts: Uses the auth instance for authentication operations
 * - src/services/storage.ts: Uses the storage instance for file operations
 * - src/services/firestore.ts: Uses the db instance for database operations
 *
 * Environment Variables Required:
 * - VITE_FIREBASE_API_KEY
 * - VITE_FIREBASE_AUTH_DOMAIN
 * - VITE_FIREBASE_PROJECT_ID
 * - VITE_FIREBASE_APP_ID
 *
 * Optional Environment Variables:
 * - VITE_FIREBASE_STORAGE_BUCKET
 * - VITE_FIREBASE_MESSAGING_SENDER_ID
 * - VITE_FIREBASE_MEASUREMENT_ID
 */
// Import Firebase core and service-specific modules
import { initializeApp } from 'firebase/app';
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';
import { getAnalytics } from 'firebase/analytics';
console.log('=== Firebase Initialization Starting ===');
// Validate required environment variables
const requiredEnvVars = [
    'VITE_FIREBASE_API_KEY',
    'VITE_FIREBASE_AUTH_DOMAIN',
    'VITE_FIREBASE_PROJECT_ID',
    'VITE_FIREBASE_APP_ID'
];
// Check for missing environment variables
const missingVars = requiredEnvVars.filter(varName => !import.meta.env[varName]);
if (missingVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
}
// Firebase configuration
const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};
console.log('Firebase config loaded:', {
    authDomain: firebaseConfig.authDomain,
    projectId: firebaseConfig.projectId,
    storageBucket: firebaseConfig.storageBucket
});
// Initialize Firebase app and services
export const app = initializeApp(firebaseConfig);
console.log('Firebase app initialized successfully');
export const auth = getAuth(app);
console.log('Firebase auth initialized successfully');
export const db = getFirestore(app);
console.log('Firebase Firestore initialized successfully');
// Enable offline persistence
enableIndexedDbPersistence(db)
    .then(() => {
    console.log('Firestore persistence enabled successfully');
})
    .catch((err) => {
    if (err.code === 'failed-precondition') {
        console.warn('Multiple tabs open, persistence can only be enabled in one tab at a time.');
    }
    else if (err.code === 'unimplemented') {
        console.warn('The current browser does not support persistence.');
    }
    else {
        console.error('Error enabling persistence:', err);
    }
});
export const storage = getStorage(app);
console.log('Firebase storage initialized successfully');
// Initialize Firebase Functions with the correct region and custom domain
export const functions = getFunctions(app);

// Connect to local emulator in development
if (import.meta.env.DEV) {
    try {
        connectFunctionsEmulator(functions, 'localhost', 5001);
        console.log('Connected to Firebase Functions emulator at localhost:5001');
    } catch (error) {
        console.warn('Failed to connect to Functions emulator:', error);
    }
}

console.log('Firebase functions initialized successfully');
// Only initialize analytics in production
export const analytics = import.meta.env.PROD ? getAnalytics(app) : null;
if (import.meta.env.PROD) {
    console.log('Firebase analytics initialized successfully');
}
console.log('=== Firebase Initialization Complete ===');
