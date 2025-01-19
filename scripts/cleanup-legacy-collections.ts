const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, deleteDoc, doc } = require('firebase/firestore');
const { writeFileSync } = require('fs');
const { join } = require('path');

// Initialize Firebase
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

interface CollectionData {
  id: string;
  data: any;
}

interface CollectionInfo {
  name: string;
  documents: CollectionData[];
}

// Legacy collections to check and clean up
const LEGACY_COLLECTIONS = [
  {
    name: 'permissions',
    newName: 'referenceData_permissions'
  },
  {
    name: 'organizations',
    newName: 'referenceData_organizations'
  }
];

// Function to get all documents from a collection
async function getCollectionData(collectionName) {
  console.log(`\nFetching data from collection: ${collectionName}`);
  const collectionRef = collection(db, collectionName);
  const snapshot = await getDocs(collectionRef);
  
  const documents = [];
  snapshot.forEach(doc => {
    documents.push({
      id: doc.id,
      data: doc.data()
    });
  });

  console.log(`Found ${documents.length} documents in ${collectionName}`);
  return {
    name: collectionName,
    documents
  };
}

// Function to compare collections
async function compareCollections(oldName, newName) {
  console.log(`\nComparing collections: ${oldName} vs ${newName}`);
  
  const oldData = await getCollectionData(oldName);
  const newData = await getCollectionData(newName);

  console.log('\nComparison Results:');
  console.log(`${oldName}: ${oldData.documents.length} documents`);
  console.log(`${newName}: ${newData.documents.length} documents`);

  // Check for documents in old collection not in new collection
  const missingInNew = oldData.documents.filter(oldDoc => 
    !newData.documents.some(newDoc => 
      JSON.stringify(oldDoc.data) === JSON.stringify(newDoc.data)
    )
  );

  if (missingInNew.length > 0) {
    console.log(`\nWARNING: Found ${missingInNew.length} documents in ${oldName} that are not in ${newName}`);
    console.log('These documents may need to be migrated before deletion.');
  }
}

// Function to backup collection data
function backupCollection(collectionInfo) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = join(__dirname, '../backups');
  const backupFile = join(backupDir, `${collectionInfo.name}_${timestamp}.json`);

  try {
    writeFileSync(backupFile, JSON.stringify(collectionInfo.documents, null, 2));
    console.log(`\nBackup created: ${backupFile}`);
  } catch (error) {
    console.error(`Error creating backup for ${collectionInfo.name}:`, error);
    throw error;
  }
}

// Function to delete a collection
async function deleteCollection(collectionName) {
  console.log(`\nDeleting collection: ${collectionName}`);
  const collectionRef = collection(db, collectionName);
  const snapshot = await getDocs(collectionRef);
  
  const deletePromises = snapshot.docs.map(async doc => {
    console.log(`Deleting document: ${doc.id}`);
    await deleteDoc(doc.ref);
  });

  await Promise.all(deletePromises);
  console.log(`Deleted ${snapshot.size} documents from ${collectionName}`);
}

async function main() {
  try {
    console.log('Starting legacy collection cleanup process...');

    // Step 1: Verify contents of collections
    for (const { name, newName } of LEGACY_COLLECTIONS) {
      await compareCollections(name, newName);
    }

    // Step 2: Create backups
    console.log('\nCreating backups...');
    for (const { name } of LEGACY_COLLECTIONS) {
      const collectionData = await getCollectionData(name);
      backupCollection(collectionData);
    }

    // Step 3: Confirm before deletion
    console.log('\nWARNING: About to delete the following collections:');
    LEGACY_COLLECTIONS.forEach(({ name }) => console.log(`- ${name}`));
    console.log('\nPlease review the comparison results and backups before proceeding.');
    console.log('To proceed with deletion, call the cleanup function manually.');

  } catch (error) {
    console.error('Error during cleanup process:', error);
  }
}

// Separate function for actual deletion (to be called manually after verification)
const runCleanup = async () => {
  try {
    console.log('\nStarting deletion process...');
    for (const { name } of LEGACY_COLLECTIONS) {
      await deleteCollection(name);
    }
    console.log('\nCleanup completed successfully!');
  } catch (error) {
    console.error('Error during deletion:', error);
  }
}

// Export functions for manual execution
module.exports = { main, cleanup: runCleanup };

// Run the main function if this script is executed directly
if (require.main === module) {
  main();
}
