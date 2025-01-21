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

async function listUsers() {
  try {
    const usersRef = db.collection('users');
    const snapshot = await usersRef.get();
    
    console.log('=== Users Collection ===');
    console.log(`Total users: ${snapshot.size}`);
    console.log('\nUsers:');
    
    snapshot.forEach(doc => {
      const data = doc.data();
      console.log(`\nUser ID: ${doc.id}`);
      console.log('Data:', JSON.stringify({
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        permissionLevel: data.permissionLevel,
        organization: data.organization,
        organizationId: data.organizationId,
        // Log all fields that might contain organization
        orgFields: Object.keys(data)
          .filter(key => typeof key === 'string' && key.toLowerCase().includes('org'))
          .reduce((obj, key) => ({
            ...obj,
            [key]: data[key]
          }), {})
      }, null, 2));
    });
  } catch (error) {
    console.error('Error listing users:', error);
    process.exit(1);
  }
}

listUsers()
  .then(() => {
    console.log('\nListing completed successfully');
    process.exit(0);
  })
  .catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });
