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
import { initializeApp, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getAuth, Auth } from 'firebase/auth';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import { getFunctions, Functions } from 'firebase/functions';
import { getAnalytics } from 'firebase/analytics';

// Start initialization process with clear logging
console.log('=== Firebase Initialization Starting ===');

// Log environment variable presence without exposing sensitive values
const envVars = {
  VITE_FIREBASE_API_KEY: !!import.meta.env.VITE_FIREBASE_API_KEY,
  VITE_FIREBASE_AUTH_DOMAIN: !!import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  VITE_FIREBASE_PROJECT_ID: !!import.meta.env.VITE_FIREBASE_PROJECT_ID,
  VITE_FIREBASE_STORAGE_BUCKET: !!import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  VITE_FIREBASE_MESSAGING_SENDER_ID: !!import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  VITE_FIREBASE_APP_ID: !!import.meta.env.VITE_FIREBASE_APP_ID,
  VITE_FIREBASE_MEASUREMENT_ID: !!import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

console.log('Environment variables present:', envVars);

// Define required environment variables
const requiredEnvVars = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_APP_ID',
] as const;

// Validate presence of required environment variables
const missingVars = requiredEnvVars.filter(envVar => !import.meta.env[envVar]);
if (missingVars.length > 0) {
  const error = `Missing required environment variables: ${missingVars.join(', ')}`;
  console.error('Firebase initialization error:', error);
  throw new Error(error);
}

// Service instance declarations
let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let functions: Functions;
let storage: FirebaseStorage;
let analytics: any;

try {
  // Step 1: Initialize Firebase App with configuration
  console.log('Creating Firebase config...');
  const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
  };

  console.log('Initializing Firebase app...');
  app = initializeApp(firebaseConfig);
  console.log('Firebase app initialized successfully');

  // Step 2: Initialize Authentication service
  console.log('Initializing Firebase Auth...');
  auth = getAuth(app);
  console.log('Firebase Auth initialized successfully');

  // Step 3: Initialize Firestore database service
  console.log('Initializing Firestore...');
  db = getFirestore(app);
  console.log('Firestore initialized successfully');

  // Step 4: Initialize Cloud Functions service
  console.log('Initializing Firebase Functions...');
  functions = getFunctions(app);
  console.log('Firebase Functions initialized successfully');

  // Step 5: Initialize Cloud Storage service
  console.log('Initializing Firebase Storage...');
  storage = getStorage(app);
  console.log('Firebase Storage initialized successfully');

  // Step 6: Initialize Analytics if measurement ID is provided
  if (import.meta.env.VITE_FIREBASE_MEASUREMENT_ID) {
    console.log('Initializing Analytics...');
    try {
      analytics = getAnalytics(app);
      console.log('Analytics initialized successfully');
    } catch (error) {
      console.warn('Failed to initialize Analytics:', error);
      analytics = null;
    }
  } else {
    console.log('Skipping Analytics initialization (no measurement ID)');
    analytics = null;
  }

  console.log('=== Firebase Initialization Complete ===');
} catch (error) {
  // Comprehensive error logging for initialization failures
  console.error('=== Firebase Initialization Failed ===');
  console.error('Error details:', error);
  
  if (error instanceof Error) {
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
  }
  
  throw error;
}

// Export initialized services for use in other modules
export { app, auth, db, functions, storage, analytics };
