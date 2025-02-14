import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyD0tA1fvWs5dCr-7JqJv_bxlay2Bhs72jQ',
  authDomain: 'pr-system-4ea55.firebaseapp.com',
  projectId: 'pr-system-4ea55',
  storageBucket: 'pr-system-4ea55.firebasestorage.app',
  messagingSenderId: '562987209098',
  appId: '1:562987209098:web:2f788d189f1c0867cb3873',
  measurementId: 'G-ZT7LN4XP80'
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function inspectCollections() {
  try {
    // List of collections to check
    const collections = [
      'referenceData_departments',
      'referenceData_organizations',
      'referenceData_permissions'
    ];

    for (const collectionName of collections) {
      console.log(`\nInspecting collection: ${collectionName}`);
      const querySnapshot = await getDocs(collection(db, collectionName));
      
      console.log(`Found ${querySnapshot.size} documents:`);
      querySnapshot.forEach(doc => {
        console.log(`\nDocument ID: ${doc.id}`);
        console.log('Data:', JSON.stringify(doc.data(), null, 2));
      });
    }
  } catch (error) {
    console.error('Error inspecting collections:', error);
  }
}

inspectCollections();
