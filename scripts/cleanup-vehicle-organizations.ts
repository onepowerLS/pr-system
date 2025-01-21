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

async function cleanupVehicleOrganizations() {
  try {
    const vehiclesRef = db.collection('referenceData_vehicles');
    const snapshot = await vehiclesRef.get();
    
    console.log('=== Cleaning up Vehicle Organizations ===');
    console.log(`Total documents to process: ${snapshot.size}`);
    
    const batch = db.batch();
    let updateCount = 0;

    for (const doc of snapshot.docs) {
      const vehicle = doc.data();
      const vehicleRef = vehiclesRef.doc(doc.id);

      // Remove organization field if it exists (whether null or undefined)
      if ('organization' in vehicle) {
        console.log(`Removing organization field from vehicle ${doc.id}`);
        batch.update(vehicleRef, {
          organization: null // Using FieldValue.delete() is not needed since we're doing a full update
        });
        updateCount++;
      }
    }

    if (updateCount > 0) {
      await batch.commit();
      console.log(`\nSuccessfully cleaned up ${updateCount} vehicles`);
    } else {
      console.log('\nNo vehicles needed cleanup');
    }
  } catch (error) {
    console.error('Error cleaning up vehicle organizations:', error);
    process.exit(1);
  }
}

cleanupVehicleOrganizations()
  .then(() => {
    console.log('\nCleanup completed successfully');
    process.exit(0);
  })
  .catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });
