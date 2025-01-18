const admin = require('firebase-admin');
const serviceAccount = require('../firebase-service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const COLLECTION_PREFIX = 'referenceData';

async function updatePermissionIds() {
  try {
    const permissionsRef = db.collection(`${COLLECTION_PREFIX}_permissions`);
    
    // Get all permissions
    const snapshot = await permissionsRef.get();
    
    // Process each document
    for (const doc of snapshot.docs) {
      const data = doc.data();
      const code = data.code;
      const desiredId = code.toLowerCase();
      
      // If the current ID doesn't match the desired ID
      if (doc.id !== desiredId) {
        console.log(`Updating permission ${doc.id} to ${desiredId}`);
        
        // Create new document with desired ID
        await permissionsRef.doc(desiredId).set({
          ...data,
          id: desiredId // Also update the id field in the data
        });
        
        // Delete old document
        await doc.ref.delete();
        
        console.log(`Successfully updated ${doc.id} to ${desiredId}`);
      }
    }
    
    console.log('Finished updating permission IDs');
    
    // Show final state
    const finalSnapshot = await permissionsRef.get();
    console.log('\nFinal Permissions:');
    finalSnapshot.forEach(doc => {
      console.log(doc.id, '=>', doc.data());
    });
    
  } catch (error) {
    console.error('Error updating permissions:', error);
  }
}

updatePermissionIds();
