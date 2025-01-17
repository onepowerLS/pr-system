const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');
require('dotenv').config();

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

async function listOrganizations() {
  try {
    // Sign in with admin credentials
    const email = process.env.VITE_TEST_EMAIL;
    const password = process.env.VITE_TEST_PASSWORD;

    if (!email || !password) {
      throw new Error('Test credentials not found in environment variables');
    }

    console.log('Signing in as admin...');
    await signInWithEmailAndPassword(auth, email, password);
    console.log('Successfully signed in');
    
    console.log('Fetching all PRs...');
    const prsRef = collection(db, 'prs');
    const snapshot = await getDocs(prsRef);

    if (snapshot.empty) {
      console.log('No PRs found in the database');
      return;
    }

    // Create a map to count organizations
    const orgCount = new Map();

    snapshot.forEach(doc => {
      const data = doc.data();
      const org = data.organization;
      if (org) {
        orgCount.set(org, (orgCount.get(org) || 0) + 1);
      }
    });

    console.log('\nOrganizations found in PRs:');
    console.log('----------------------------');
    for (const [org, count] of orgCount.entries()) {
      console.log(`${org}: ${count} PR(s)`);
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

// Run the script
listOrganizations().then(() => {
  console.log('\nScript completed');
  process.exit(0);
}).catch(error => {
  console.error('Script failed:', error);
  process.exit(1);
});
