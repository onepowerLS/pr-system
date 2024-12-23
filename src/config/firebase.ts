import { initializeApp, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getAuth, Auth, connectAuthEmulator } from 'firebase/auth';
import { getStorage, FirebaseStorage, connectStorageEmulator } from 'firebase/storage';
import { getFunctions, Functions, connectFunctionsEmulator } from 'firebase/functions';
import { getAnalytics } from 'firebase/analytics';

console.log('=== Firebase Initialization Starting ===');

// Log environment variable presence (not values for security)
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

// Validate required environment variables
const requiredEnvVars = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_APP_ID',
] as const;

const missingVars = requiredEnvVars.filter(envVar => !import.meta.env[envVar]);
if (missingVars.length > 0) {
  const error = `Missing required environment variables: ${missingVars.join(', ')}`;
  console.error('Firebase initialization error:', error);
  throw new Error(error);
}

let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let functions: Functions;
let storage: FirebaseStorage;
let analytics: any;

try {
  // Step 1: Initialize Firebase App
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

  // Step 2: Initialize Auth
  console.log('Initializing Firebase Auth...');
  auth = getAuth(app);
  
  // Connect to emulators in development
  if (import.meta.env.DEV) {
    console.log('Development environment detected, connecting to emulators...');
    try {
      connectAuthEmulator(auth, 'http://localhost:9099');
      console.log('Connected to Auth emulator');
    } catch (error) {
      console.warn('Failed to connect to Auth emulator:', error);
    }
  }

  // Step 3: Initialize Firestore
  console.log('Initializing Firestore...');
  db = getFirestore(app);
  
  if (import.meta.env.DEV) {
    try {
      connectFirestoreEmulator(db, 'localhost', 8080);
      console.log('Connected to Firestore emulator');
    } catch (error) {
      console.warn('Failed to connect to Firestore emulator:', error);
    }
  }

  // Step 4: Initialize Functions
  console.log('Initializing Firebase Functions...');
  functions = getFunctions(app);
  
  if (import.meta.env.DEV) {
    try {
      connectFunctionsEmulator(functions, 'localhost', 5001);
      console.log('Connected to Functions emulator');
    } catch (error) {
      console.warn('Failed to connect to Functions emulator:', error);
    }
  }

  // Step 5: Initialize Storage
  console.log('Initializing Firebase Storage...');
  storage = getStorage(app);
  
  if (import.meta.env.DEV) {
    try {
      connectStorageEmulator(storage, 'localhost', 9199);
      console.log('Connected to Storage emulator');
    } catch (error) {
      console.warn('Failed to connect to Storage emulator:', error);
    }
  }

  // Step 6: Initialize Analytics (optional)
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
  console.error('=== Firebase Initialization Failed ===');
  console.error('Error details:', error);
  
  if (error instanceof Error) {
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
  }
  
  throw error;
}

export { app, auth, db, functions, storage, analytics };
