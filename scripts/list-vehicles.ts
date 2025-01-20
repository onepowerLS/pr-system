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

async function listVehicles() {
  try {
    const collectionName = "referenceData_vehicles"
    console.log(`\nListing all vehicles in ${collectionName}...`)
    
    const collectionRef = db.collection(collectionName)
    const snapshot = await collectionRef.get()
    
    console.log(`\nFound ${snapshot.size} vehicles:`)
    snapshot.docs.forEach(doc => {
      const data = doc.data()
      console.log('\n-------------------')
      console.log(`Vehicle ID: ${doc.id}`)
      console.log('Organization fields:')
      console.log('  organizationId:', data.organizationId)
      console.log('  organization:', JSON.stringify(data.organization, null, 2))
      console.log('Full data:', JSON.stringify(data, null, 2))
    })
  } catch (error) {
    console.error('Error listing vehicles:', error)
    throw error
  }
}

listVehicles()
  .then(() => {
    console.log('\nListing completed successfully')
    process.exit(0)
  })
  .catch(error => {
    console.error('\nListing failed:', error)
    process.exit(1)
  })
