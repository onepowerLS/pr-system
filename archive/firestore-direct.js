import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Initialize with application default credentials (works in GCP environment)
initializeApp({
  projectId: 'pr-system-4ea55'
});

const db = getFirestore();

async function queryCollections() {
  try {
    console.log('QUERYING FIRESTORE COLLECTIONS DIRECTLY');
    console.log('======================================');
    
    // USERS COLLECTION
    console.log('\n1. USERS COLLECTION:');
    console.log('--------------------');
    const usersSnapshot = await db.collection('users').limit(10).get();
    console.log(`Found ${usersSnapshot.size} users`);
    
    if (usersSnapshot.size > 0) {
      console.log('\nUser Collection Structure:');
      usersSnapshot.docs.slice(0, 3).forEach((doc, i) => {
        console.log(`\nUSER ${i+1} (ID: ${doc.id}):`);
        console.log(JSON.stringify(doc.data(), null, 2));
      });
    } else {
      console.log('No users found in collection');
    }
    
    // Check for specific email
    const specificEmail = 'jopi@1pwrafrica.com';
    console.log(`\nLooking for specific user with email: ${specificEmail}`);
    
    // Try direct document lookup
    const directUserDoc = await db.collection('users').doc(specificEmail).get();
    console.log(`Direct document lookup (ID = email): ${directUserDoc.exists ? 'FOUND' : 'NOT FOUND'}`);
    
    // Try email field query
    const emailQuery = await db.collection('users').where('email', '==', specificEmail).get();
    console.log(`Email field query: ${emailQuery.size} results`);
    
    // Try userEmail field query
    const userEmailQuery = await db.collection('users').where('userEmail', '==', specificEmail).get();
    console.log(`userEmail field query: ${userEmailQuery.size} results`);
    
    // VENDORS COLLECTION
    console.log('\n\n2. VENDORS COLLECTION:');
    console.log('----------------------');
    const vendorsSnapshot = await db.collection('vendors').limit(10).get();
    console.log(`Found ${vendorsSnapshot.size} vendors`);
    
    if (vendorsSnapshot.size > 0) {
      console.log('\nVendor Collection Structure:');
      vendorsSnapshot.docs.slice(0, 3).forEach((doc, i) => {
        console.log(`\nVENDOR ${i+1} (ID: ${doc.id}):`);
        console.log(JSON.stringify(doc.data(), null, 2));
      });
    } else {
      console.log('No vendors found in collection');
    }
    
    // Check for specific vendor IDs
    const vendorIds = ['1028', '1032'];
    for (const vendorId of vendorIds) {
      console.log(`\nLooking for vendor with ID: ${vendorId}`);
      
      // Try direct document lookup
      const directVendorDoc = await db.collection('vendors').doc(vendorId).get();
      console.log(`Direct document lookup (ID = ${vendorId}): ${directVendorDoc.exists ? 'FOUND' : 'NOT FOUND'}`);
      
      // Try vendorId field query (string)
      const vendorIdQuery = await db.collection('vendors').where('vendorId', '==', vendorId).get();
      console.log(`vendorId field query (string): ${vendorIdQuery.size} results`);
      
      // Try vendorId field query (number)
      const vendorIdNumQuery = await db.collection('vendors').where('vendorId', '==', parseInt(vendorId)).get();
      console.log(`vendorId field query (number): ${vendorIdNumQuery.size} results`);
    }
    
    console.log('\n======================================');
    console.log('FIRESTORE QUERY COMPLETE');
    
  } catch (error) {
    console.error('Error querying Firestore:', error);
  }
}

queryCollections();
