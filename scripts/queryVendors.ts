import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
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

async function queryVendors() {
  try {
    console.log('Signing in...');
    const authSuccess = await signIn();
    if (!authSuccess) {
      console.error('Authentication failed');
      process.exit(1);
    }
    console.log('Authentication successful');
    
    console.log('Querying vendors collection...');
    
    // Get vendors collection
    const vendorsRef = collection(db, 'referenceData_vendors');
    const snapshot = await getDocs(vendorsRef);

    console.log('\nVendors Collection Contents:');
    console.log('Total vendors:', snapshot.size);
    
    const vendors = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // Count active vendors
    const activeVendors = vendors.filter(v => v.active);
    console.log('Active vendors:', activeVendors.length);

    console.log('\nVendor Details:');
    vendors.sort((a, b) => a.code.localeCompare(b.code));
    vendors.forEach(vendor => {
      console.log(`\nID: ${vendor.id}`);
      console.log(`Name: ${vendor.name}`);
      console.log(`Code: ${vendor.code}`);
      console.log(`Active: ${vendor.active}`);
      console.log(`Approved: ${vendor.approved}`);
      if (vendor.productsServices) {
        console.log(`Products/Services: ${vendor.productsServices}`);
      }
      console.log('---');
    });

    // Clean exit after data is retrieved
    process.exit(0);

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

// Run the query
queryVendors();
