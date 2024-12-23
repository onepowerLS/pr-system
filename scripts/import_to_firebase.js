const admin = require('firebase-admin');
const fs = require('fs');

// Initialize Firebase Admin
const serviceAccount = require('../firebase-credentials.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function importApprovers() {
  try {
    // Read the approvers JSON file
    const approversData = JSON.parse(fs.readFileSync('./approvers.json', 'utf8'));
    
    // Batch write to Firestore
    const batch = db.batch();
    
    // Add each approver to the batch
    approversData.approvers.forEach((approver) => {
      const approverRef = db.collection('users').doc(approver.id);
      batch.set(approverRef, {
        ...approver,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    });
    
    // Commit the batch
    await batch.commit();
    console.log(`Successfully imported ${approversData.approvers.length} approvers to Firestore`);
    
  } catch (error) {
    console.error('Error importing approvers:', error);
  } finally {
    // Exit the process
    process.exit();
  }
}

// Run the import
importApprovers();
