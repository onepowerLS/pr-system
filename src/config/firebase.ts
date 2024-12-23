import { initializeApp, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getAuth, Auth } from 'firebase/auth';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import { getFunctions, Functions } from 'firebase/functions';
import { getAnalytics } from 'firebase/analytics';

console.log('firebase.ts: Starting Firebase initialization');

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

console.log('firebase.ts: Environment variables present:', envVars);

// Validate required environment variables
const requiredEnvVars = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
] as const;

// Check environment variables
const missingVars = requiredEnvVars.filter(envVar => !import.meta.env[envVar]);
if (missingVars.length > 0) {
  const error = `Missing required environment variables: ${missingVars.join(', ')}`;
  console.error('firebase.ts:', error);
  throw new Error(error);
}

// Log config (excluding sensitive data)
console.log('firebase.ts: Firebase config:', {
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  // Excluding apiKey and other sensitive data
});

let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let functions: Functions;
let storage: FirebaseStorage;
let analytics: any;

try {
  const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
  };

  // Check for required config
  const requiredConfig = [
    'apiKey',
    'authDomain',
    'projectId',
    'storageBucket',
    'messagingSenderId',
    'appId',
  ];

  const missingConfig = requiredConfig.filter(key => !firebaseConfig[key as keyof typeof firebaseConfig]);
  if (missingConfig.length > 0) {
    throw new Error(`Missing required Firebase configuration: ${missingConfig.join(', ')}`);
  }

  console.log('firebase.ts: All required configuration present');
  console.log('firebase.ts: Initializing Firebase app');
  app = initializeApp(firebaseConfig);

  console.log('firebase.ts: Initializing Firebase Auth');
  auth = getAuth(app);

  console.log('firebase.ts: Initializing Firestore');
  db = getFirestore(app);

  console.log('firebase.ts: Initializing Firebase Functions');
  functions = getFunctions(app);

  console.log('firebase.ts: Initializing Firebase Storage');
  storage = getStorage(app);

  if (import.meta.env.VITE_FIREBASE_MEASUREMENT_ID) {
    console.log('firebase.ts: Initializing Analytics');
    analytics = getAnalytics(app);
    console.log('firebase.ts: Analytics initialized');
  } else {
    console.log('firebase.ts: Skipping Analytics initialization (no measurement ID)');
    analytics = null;
  }

  console.log('firebase.ts: Firebase initialization complete');
} catch (error) {
  console.error('firebase.ts: Firebase initialization failed:', error);
  // Try to provide more specific error messages
  if (error instanceof Error) {
    if (error.message.includes('API key')) {
      throw new Error('Invalid Firebase API key. Please check your environment variables.');
    } else if (error.message.includes('project')) {
      throw new Error('Invalid Firebase project configuration. Please check your environment variables.');
    } else {
      throw new Error(`Firebase initialization failed: ${error.message}`);
    }
  }
  throw error;
}

export { app, db, auth, storage, functions, analytics };
