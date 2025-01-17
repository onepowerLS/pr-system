const admin = require('firebase-admin');
const serviceAccount = require('../firebase-service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function setAdminUser() {
  try {
    // Get user by UID
    const uid = 'RgxyHftiasT6Lz4ZbgY6MfEi2xx2';  // Your UID from the logs
    
    await db.collection('users').doc(uid).set({
      role: 'ADMIN',
      permissionLevel: 1,
      isActive: true,
      email: 'mso@1pwrafrica.com',
      name: 'Matt Orosz',
      organization: {
        id: '1PWR',
        name: '1PWR LESOTHO'
      }
    }, { merge: true });
    
    console.log('Successfully updated admin user');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit();
  }
}

setAdminUser();
