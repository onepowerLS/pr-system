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

async function addIsActiveToUsers() {
  try {
    console.log('=== Adding isActive field to Users Collection ===');
    
    // Get all users
    const usersRef = db.collection('users');
    const snapshot = await usersRef.get();
    
    if (snapshot.empty) {
      console.log('No users found in the collection.');
      return;
    }

    console.log(`Found ${snapshot.size} users to update.`);
    
    // Update each user in batches (Firestore has a limit of 500 operations per batch)
    const batchSize = 500;
    let batch = db.batch();
    let operationCount = 0;
    let totalUpdated = 0;

    for (const doc of snapshot.docs) {
      const data = doc.data();
      
      // Only update if isActive is not already set
      if (data.isActive === undefined) {
        console.log(`Setting isActive=true for user: ${doc.id} (${data.firstName} ${data.lastName})`);
        batch.update(doc.ref, { isActive: true });
        operationCount++;
        totalUpdated++;
      }

      // Commit the batch when we reach the batch size limit
      if (operationCount === batchSize) {
        await batch.commit();
        console.log(`Committed batch of ${operationCount} updates`);
        batch = db.batch();
        operationCount = 0;
      }
    }

    // Commit any remaining updates
    if (operationCount > 0) {
      await batch.commit();
      console.log(`Committed final batch of ${operationCount} updates`);
    }

    console.log(`\nSuccessfully updated ${totalUpdated} users with isActive=true`);
    
  } catch (error) {
    console.error('Error updating users:', error);
    process.exit(1);
  }
}

addIsActiveToUsers()
  .then(() => {
    console.log('\nUpdate completed successfully');
    process.exit(0);
  })
  .catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });
