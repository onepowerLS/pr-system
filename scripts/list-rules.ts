import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
  measurementId: process.env.VITE_FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

async function listRules() {
  try {
    // Sign in first
    await signInWithEmailAndPassword(
      auth,
      process.env.VITE_TEST_EMAIL!,
      process.env.VITE_TEST_PASSWORD!
    );

    // Check both potential collections
    const collections = [
      'referenceData_rules',
      'referenceData_organizations'
    ];

    for (const collectionName of collections) {
      console.log(`\nChecking collection: ${collectionName}`);
      console.log('===============================');
      
      const collectionRef = collection(db, collectionName);
      const snapshot = await getDocs(collectionRef);
      
      if (snapshot.empty) {
        console.log('No documents found');
        continue;
      }

      snapshot.forEach(doc => {
        const data = doc.data();
        console.log(`\nDocument ID: ${doc.id}`);
        console.log('Data:', JSON.stringify(data, null, 2));
      });
      
      console.log(`\nTotal Documents: ${snapshot.size}`);
    }

    // Sign out after we're done
    await auth.signOut();
  } catch (error) {
    console.error('Error:', error);
  }
}

listRules();
