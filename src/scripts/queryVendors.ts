import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import * as dotenv from 'dotenv';
import { signIn } from '../services/auth';

// Load environment variables from .env file
dotenv.config({ path: '.env.local' });

// Initialize Firebase
const app = initializeApp({
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID
});
const db = getFirestore(app);

async function queryVendors() {
  try {
    // Sign in first
    await signIn();
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

  } catch (error) {
    console.error('Error querying vendors:', error);
    process.exit(1);
  }
}

// Run the query
queryVendors();
