const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, writeBatch, doc } = require('firebase/firestore');
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');

// Constants
const COLLECTION_PREFIX = 'referenceData';
const PERMISSIONS_COLLECTION = `${COLLECTION_PREFIX}_permissions`;

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyD0tA1fvWs5dCr-7JqJv_bxlay2Bhs72jQ",
  authDomain: "pr-system-4ea55.firebaseapp.com",
  projectId: "pr-system-4ea55",
  storageBucket: "pr-system-4ea55.firebasestorage.app",
  messagingSenderId: "562987209098",
  appId: "1:562987209098:web:2f788d189f1c0867cb3873",
  measurementId: "G-ZT7LN4XP80"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

async function normalizePermissionLevels() {
  try {
    // Sign in first
    console.log('Signing in...');
    await signInWithEmailAndPassword(auth, "mso@1pwrafrica.com", "1PWR00");
    console.log('Signed in successfully');
    
    console.log('Fetching permissions...');
    const permissionsRef = collection(db, PERMISSIONS_COLLECTION);
    const snapshot = await getDocs(permissionsRef);
    
    console.log('Current permissions:');
    snapshot.forEach(docSnapshot => {
      const data = docSnapshot.data();
      console.log(`${docSnapshot.id} => level: ${data.level} (${typeof data.level})`);
    });
    
    console.log('\nUpdating permissions...');
    const batch = writeBatch(db);
    
    snapshot.forEach(docSnapshot => {
      const data = docSnapshot.data();
      if (typeof data.level === 'string') {
        console.log(`Converting ${docSnapshot.id} level from string "${data.level}" to number ${Number(data.level)}`);
        const docRef = doc(db, PERMISSIONS_COLLECTION, docSnapshot.id);
        batch.update(docRef, { level: Number(data.level) });
      }
    });
    
    await batch.commit();
    console.log('\nPermissions updated successfully');
    
    // Verify the changes
    console.log('\nVerifying changes...');
    const verifySnapshot = await getDocs(permissionsRef);
    verifySnapshot.forEach(docSnapshot => {
      const data = docSnapshot.data();
      console.log(`${docSnapshot.id} => level: ${data.level} (${typeof data.level})`);
    });
    
  } catch (error) {
    console.error('Error updating permissions:', error);
  }
}

normalizePermissionLevels().then(() => process.exit(0));
