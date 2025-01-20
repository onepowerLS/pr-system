import { initializeApp, cert } from "firebase-admin/app"
import { getFirestore } from "firebase-admin/firestore"
import { config } from "dotenv"
import { readFileSync } from "fs"
import { join } from "path"

// Initialize environment variables
config()

// Load service account
const serviceAccount = JSON.parse(
  readFileSync(join(__dirname, '../firebase-service-account.json'), 'utf8')
)

// Initialize Firebase Admin
const app = initializeApp({
  credential: cert(serviceAccount)
})

const db = getFirestore(app)

async function deleteApproversCollection() {
  try {
    console.log('=== Deleting Approvers Collection ===');
    
    // Get all documents in the approvers collection
    const approversRef = db.collection('approvers');
    const snapshot = await approversRef.get();
    
    if (snapshot.empty) {
      console.log('No approvers found in the collection.');
      return;
    }

    console.log(`Found ${snapshot.size} approvers to delete.`);
    
    // Delete each document
    const batch = db.batch();
    snapshot.docs.forEach(doc => {
      console.log(`Deleting approver: ${doc.id}`);
      batch.delete(doc.ref);
    });
    
    // Commit the batch
    await batch.commit();
    console.log('Successfully deleted all approvers.');
    
  } catch (error) {
    console.error('Error deleting approvers:', error);
    process.exit(1);
  }
}

deleteApproversCollection()
  .then(() => {
    console.log('\nCleanup completed successfully');
    process.exit(0);
  })
  .catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });
