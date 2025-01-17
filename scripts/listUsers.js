const admin = require('firebase-admin');
const path = require('path');
const serviceAccount = require(path.join(__dirname, '..', 'firebase-service-account.json'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function listUsers() {
  try {
    const snapshot = await db.collection('users').get();
    console.log('Total users:', snapshot.size);
    snapshot.forEach(doc => {
      console.log('\nUser:', doc.id);
      console.log('Data:', JSON.stringify(doc.data(), null, 2));
    });
  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit();
  }
}

listUsers();
