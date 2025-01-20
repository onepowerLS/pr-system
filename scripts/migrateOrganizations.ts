import { db } from './firebase';
import { collection, getDocs, doc, updateDoc, deleteField } from 'firebase/firestore';

// Initialize Firebase Admin
// const serviceAccount = require('../service-account.json');
// admin.initializeApp({
//   credential: admin.credential.cert(serviceAccount)
// });

// const db = getFirestore();

interface OldOrganization {
  id: string;
  name: string;
  shortName?: string;
  country?: string;
  timezone?: string;
  currency?: string;
  active: boolean;
}

const TIMEZONE_TO_OFFSET: { [key: string]: number } = {
  'Africa/Maseru': 2,    // SAST
  'Africa/Lusaka': 2,    // CAT
  'Africa/Porto-Novo': 1 // WAT
};

async function migrateOrganizations() {
  const collectionRef = collection(db, 'referenceData_organizations');
  const snapshot = await getDocs(collectionRef);
  
  for (const docSnap of snapshot.docs) {
    const org = docSnap.data() as OldOrganization;
    console.log(`Migrating organization: ${org.name}`);
    
    // Convert timezone to offset
    let timezoneOffset = 2; // Default to SAST
    if (org.timezone && TIMEZONE_TO_OFFSET[org.timezone]) {
      timezoneOffset = TIMEZONE_TO_OFFSET[org.timezone];
    }
    
    // Use code as is, or convert name to code format
    const code = org.id || org.name?.toUpperCase().replace(/\s+/g, '_');
    
    // Update the document
    await updateDoc(doc(collectionRef, docSnap.id), {
      code,
      name: org.name,
      country: org.country,
      timezoneOffset,
      currency: org.currency,
      // Remove old fields
      shortName: deleteField(),
      timezone: deleteField(),
    });
    
    console.log(`Updated organization ${org.name} with code ${code}`);
  }
  
  console.log('Organization migration complete');
}

migrateOrganizations().catch(console.error);
