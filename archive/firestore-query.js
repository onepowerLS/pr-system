import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Initialize Firebase Admin using the project credentials
initializeApp({
  credential: cert({
    projectId: 'pr-system-4ea55',
    clientEmail: 'firebase-adminsdk-rfxva@pr-system-4ea55.iam.gserviceaccount.com',
    // Private key comes from a JSON file normally, but we'll use environment variable
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
  })
});

const db = getFirestore();

async function queryCollections() {
  const results = {
    users: [],
    vendors: []
  };
  
  try {
    // Query the users collection (limited to 50 for performance)
    console.log('Querying users collection...');
    const usersSnapshot = await db.collection('users').limit(50).get();
    results.users = usersSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    console.log(`Found ${results.users.length} users`);
    
    // Show first 5 users with their structure
    console.log('\nFirst 5 users:');
    results.users.slice(0, 5).forEach((user, index) => {
      console.log(`User ${index + 1}:`, JSON.stringify(user, null, 2));
    });
    
    // Query for the specific user with email jopi@1pwrafrica.com
    console.log('\nSearching for specific user jopi@1pwrafrica.com...');
    const jopiQuery = await db.collection('users')
      .where('email', '==', 'jopi@1pwrafrica.com')
      .get();
    console.log(`Direct email query found ${jopiQuery.size} results`);
    
    if (!jopiQuery.empty) {
      jopiQuery.docs.forEach(doc => {
        console.log(`Found user with ID ${doc.id}:`, JSON.stringify(doc.data(), null, 2));
      });
    }
    
    // Try alternate field names for the email
    const jopiDirectDoc = await db.collection('users').doc('jopi@1pwrafrica.com').get();
    console.log('\nDirect document lookup result:');
    if (jopiDirectDoc.exists) {
      console.log(`Found document with ID ${jopiDirectDoc.id}:`, JSON.stringify(jopiDirectDoc.data(), null, 2));
    } else {
      console.log('No document found with ID jopi@1pwrafrica.com');
    }
    
    const jopiUserEmailQuery = await db.collection('users').where('userEmail', '==', 'jopi@1pwrafrica.com').get();
    console.log('\nuserEmail field query result:');
    if (!jopiUserEmailQuery.empty) {
      jopiUserEmailQuery.docs.forEach(doc => {
        console.log(`Found user with ID ${doc.id}:`, JSON.stringify(doc.data(), null, 2));
      });
    } else {
      console.log('No users found with userEmail = jopi@1pwrafrica.com');
    }
    
    // Query the vendors collection (limited to 50 for performance)
    console.log('\nQuerying vendors collection...');
    const vendorsSnapshot = await db.collection('vendors').limit(50).get();
    results.vendors = vendorsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    console.log(`Found ${results.vendors.length} vendors`);
    
    // Show first 5 vendors with their structure
    console.log('\nFirst 5 vendors:');
    results.vendors.slice(0, 5).forEach((vendor, index) => {
      console.log(`Vendor ${index + 1}:`, JSON.stringify(vendor, null, 2));
    });
    
    // Look specifically for vendor 1028 and 1032
    console.log('\nSearching for vendor with ID 1028...');
    const vendor1028 = await db.collection('vendors').doc('1028').get();
    if (vendor1028.exists) {
      console.log('Found vendor document directly:', JSON.stringify(vendor1028.data(), null, 2));
    } else {
      console.log('No vendor document with ID 1028 found directly');
    }
    
    console.log('\nSearching for vendor with ID 1032...');
    const vendor1032 = await db.collection('vendors').doc('1032').get();
    if (vendor1032.exists) {
      console.log('Found vendor document directly:', JSON.stringify(vendor1032.data(), null, 2));
    } else {
      console.log('No vendor document with ID 1032 found directly');
    }
    
    // Try querying with a field match for 1028
    const vendor1028Query = await db.collection('vendors').where('vendorId', '==', '1028').get();
    console.log('\nvendorId field query for 1028:');
    if (!vendor1028Query.empty) {
      vendor1028Query.docs.forEach(doc => {
        console.log(`Found vendor with ID ${doc.id}:`, JSON.stringify(doc.data(), null, 2));
      });
    } else {
      console.log('No vendors found with vendorId = 1028');
      
      // Try numeric search
      const numericQuery = await db.collection('vendors').where('vendorId', '==', 1028).get();
      if (!numericQuery.empty) {
        numericQuery.docs.forEach(doc => {
          console.log(`Found vendor with ID ${doc.id} (numeric search):`, JSON.stringify(doc.data(), null, 2));
        });
      } else {
        console.log('No vendors found with vendorId = 1028 (numeric)');
      }
    }
    
    // Write the full results to a file
    fs.writeFileSync('firestore-results.json', JSON.stringify(results, null, 2));
    console.log('\nResults written to firestore-results.json');
    
  } catch (error) {
    console.error('Error querying Firestore:', error);
  }
}

queryCollections();
