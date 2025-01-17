const { initializeApp } = require('firebase/app');
const { getFirestore, collection, query, where, getDocs, writeBatch } = require('firebase/firestore');
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

async function updatePuecoOrganization() {
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
    
    console.log('Starting PUECO organization update...');
    
    // Check for different possible formats of PUECO
    const organizationFormats = [
      'PUECO', 'Pueco', 'pueco',
      'PUECO ', ' PUECO', // with spaces
      'PUECO_LESOTHO', 'Pueco_Lesotho', 'pueco_lesotho', // with Lesotho
      'PUECO LSO', 'Pueco LSO', 'pueco lso', // with LSO
      'PUECO LESOTHO', 'Pueco Lesotho', 'pueco lesotho' // with space
    ];
    let allPRs = [];

    for (const format of organizationFormats) {
      console.log(`Checking for organization "${format}"...`);
      const prsRef = collection(db, 'prs');
      const q = query(prsRef, where('organization', '==', format));
      const snapshot = await getDocs(q);
      
      if (!snapshot.empty) {
        console.log(`Found ${snapshot.size} PRs with organization "${format}"`);
        snapshot.forEach(doc => allPRs.push(doc));
      }
    }

    if (allPRs.length === 0) {
      console.log('No PRs found with any variation of PUECO organization');
      return;
    }

    console.log(`Found total of ${allPRs.length} PRs to update`);

    // Update each PR
    const batch = writeBatch(db);
    allPRs.forEach(doc => {
      batch.update(doc.ref, { organization: 'PUECO_LSO' });
      console.log(`Queued update for PR ${doc.id}`);
    });

    // Commit the batch
    await batch.commit();
    console.log('Successfully updated all PRs');

  } catch (error) {
    console.error('Error updating PRs:', error);
  }
}

// Run the update
updatePuecoOrganization().then(() => {
  console.log('Update script completed');
  process.exit(0);
}).catch(error => {
  console.error('Script failed:', error);
  process.exit(1);
});
