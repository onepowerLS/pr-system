const admin = require('firebase-admin');
const serviceAccount = require('../firebase-service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const COLLECTION_PREFIX = 'referenceData'; 

async function checkPermissions() {
  try {
    const permissionsRef = db.collection(`${COLLECTION_PREFIX}_permissions`);
    const snapshot = await permissionsRef.get();
    
    console.log('Permissions:');
    snapshot.forEach(doc => {
      console.log(doc.id, '=>', doc.data());
    });
  } catch (error) {
    console.error('Error fetching permissions:', error);
  }
}

checkPermissions();
