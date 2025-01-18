const admin = require('firebase-admin');
const serviceAccount = require('../firebase-service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function checkPermissions() {
  try {
    const permissionsRef = db.collection('permissions');
    const snapshot = await permissionsRef.get();
    
    console.log('Permissions:');
    snapshot.forEach((doc: FirebaseFirestore.QueryDocumentSnapshot) => {
      console.log(doc.id, '=>', doc.data());
    });
  } catch (error) {
    console.error('Error fetching permissions:', error);
  }
}

checkPermissions();
