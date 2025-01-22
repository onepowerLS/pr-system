import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, updateDoc, doc } from 'firebase/firestore';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';

// Firebase configuration
const app = initializeApp({
  apiKey: "AIzaSyD0tA1fvWs5dCr-7JqJv_bxlay2Bhs72jQ",
  authDomain: "pr-system-4ea55.firebaseapp.com",
  projectId: "pr-system-4ea55",
  storageBucket: "pr-system-4ea55.firebasestorage.app",
  messagingSenderId: "562987209098",
  appId: "1:562987209098:web:2f788d189f1c0867cb3873"
});

const auth = getAuth(app);
const db = getFirestore(app);

async function signIn() {
  try {
    await signInWithEmailAndPassword(auth, "mso@1pwrafrica.com", "1PWR00");
    return true;
  } catch (error) {
    console.error('Authentication error:', error);
    return false;
  }
}

async function setVendorsActive() {
  try {
    console.log('Signing in...');
    const authSuccess = await signIn();
    if (!authSuccess) {
      console.error('Authentication failed');
      process.exit(1);
    }
    console.log('Authentication successful');
    
    console.log('Getting vendors...');
    const vendorsRef = collection(db, 'referenceData_vendors');
    const snapshot = await getDocs(vendorsRef);
    
    console.log(`Found ${snapshot.size} vendors. Setting them as active...`);
    
    const updates = snapshot.docs.map(async (docRef) => {
      const vendorRef = doc(db, 'referenceData_vendors', docRef.id);
      return updateDoc(vendorRef, {
        active: true
      });
    });
    
    await Promise.all(updates);
    console.log('Successfully set all vendors as active');
    process.exit(0);

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

// Run the update
setVendorsActive();
