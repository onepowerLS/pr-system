import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, updateDoc, doc } from 'firebase/firestore';

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
const db = getFirestore(app);

// Organization mapping
const organizationMapping: Record<string, string> = {
  '1PWR_LSO': '1PWR LESOTHO',
  '1pwr_lso': '1PWR LESOTHO',
  '1PWR LSO': '1PWR LESOTHO',
  '1pwr_lesotho': '1PWR LESOTHO',
  'Codeium': '1PWR LESOTHO',  // Default organization
};

async function updateUserOrganizations() {
  try {
    console.log('Starting user organization update...');
    const usersRef = collection(db, 'users');
    const snapshot = await getDocs(usersRef);
    
    let updateCount = 0;
    const updates: Promise<void>[] = [];

    snapshot.forEach((userDoc) => {
      const userData = userDoc.data();
      const currentOrg = userData.organization;
      
      // Check if organization needs to be updated
      if (currentOrg && organizationMapping[currentOrg]) {
        console.log(`Updating user ${userData.email} organization from "${currentOrg}" to "1PWR LESOTHO"`);
        
        updates.push(
          updateDoc(doc(db, 'users', userDoc.id), {
            organization: '1PWR LESOTHO',
            updatedAt: new Date().toISOString()
          })
        );
        updateCount++;
      }

      // Also update additionalOrganizations if present
      if (userData.additionalOrganizations?.length > 0) {
        const updatedAdditionalOrgs = userData.additionalOrganizations.map(
          (org: string) => organizationMapping[org] || org
        );
        
        updates.push(
          updateDoc(doc(db, 'users', userDoc.id), {
            additionalOrganizations: updatedAdditionalOrgs,
            updatedAt: new Date().toISOString()
          })
        );
      }
    });

    // Wait for all updates to complete
    await Promise.all(updates);
    console.log(`Successfully updated ${updateCount} users' organizations`);

  } catch (error) {
    console.error('Error updating user organizations:', error);
    throw error;
  }
}

// Run the update
updateUserOrganizations()
  .then(() => {
    console.log('Organization update completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Organization update failed:', error);
    process.exit(1);
  });
