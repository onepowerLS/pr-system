import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, updateDoc, query, where } from 'firebase/firestore';

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

function standardizeOrgId(id) {
  if (!id) return id;
  return id.toLowerCase().replace(/[^a-z0-9]/g, '_');
}

async function normalizeOrganizationRefs() {
  try {
    const collectionName = 'referenceData_departments';
    console.log(`\nNormalizing organization references in collection: ${collectionName}`);
    
    const querySnapshot = await getDocs(collection(db, collectionName));
    console.log(`Found ${querySnapshot.size} documents to process`);
    
    for (const docRef of querySnapshot.docs) {
      const data = docRef.data();
      const orgId = data.organizationId || data.organization?.id;
      
      if (!orgId) {
        console.log(`Warning: Document ${docRef.id} has no organization reference`);
        continue;
      }

      const standardizedOrgId = standardizeOrgId(orgId);
      const updates = {
        organizationId: standardizedOrgId
      };

      // Remove the old organization object if it exists
      if (data.organization) {
        updates.organization = null;
      }

      console.log(`Updating document ${docRef.id}:`);
      console.log('- Old organization reference:', data.organization || data.organizationId);
      console.log('- New organizationId:', standardizedOrgId);

      await updateDoc(doc(db, collectionName, docRef.id), updates);
      console.log('✓ Updated successfully\n');
    }

    console.log('Normalization complete!');
  } catch (error) {
    console.error('Error normalizing organization references:', error);
  }
}

normalizeOrganizationRefs();
