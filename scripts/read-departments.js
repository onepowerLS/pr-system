const admin = require('firebase-admin');

// Initialize without service account, will use environment credentials
admin.initializeApp();

const db = admin.firestore();

async function readDepartments() {
  try {
    const snapshot = await db.collection('referenceData_departments').get();
    console.log('\nAll departments:');
    snapshot.forEach(doc => {
      console.log('\nDocument ID:', doc.id);
      console.log('Data:', doc.data());
    });
  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit();
  }
}

readDepartments();
