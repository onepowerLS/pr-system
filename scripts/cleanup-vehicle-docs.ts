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

function standardizeOrgId(id: string): string {
  return id.toLowerCase().replace(/\s+/g, '_')
}

async function cleanupVehicleDocs() {
  try {
    const collectionName = "referenceData_vehicles"
    console.log(`\nCleaning up vehicle documents in ${collectionName}...`)
    
    const collectionRef = db.collection(collectionName)
    const snapshot = await collectionRef.get()
    
    console.log(`\nFound ${snapshot.size} vehicles to process`)
    let updatedCount = 0

    for (const doc of snapshot.docs) {
      const data = doc.data()
      const updates: any = {}
      let needsUpdate = false

      // Get the standardized organization ID from the current data
      const orgId = data.organization?.id || data.organizationId
      if (orgId) {
        const standardizedId = standardizeOrgId(orgId)
        
        // Only keep organizationId field, remove organization object
        if (data.organizationId !== standardizedId || data.organization) {
          updates.organizationId = standardizedId
          updates.organization = null // This will be removed by Firestore
          needsUpdate = true
        }
      }

      if (needsUpdate) {
        console.log(`\nUpdating vehicle ${doc.id}:`)
        console.log('  Current:', {
          organizationId: data.organizationId,
          organization: data.organization
        })
        console.log('  Updates:', updates)

        await doc.ref.update({
          ...updates,
          organization: null // Explicitly remove the organization field
        })
        updatedCount++
      }
    }
    
    console.log(`\nUpdated ${updatedCount} vehicles`)
  } catch (error) {
    console.error('Error cleaning up vehicle documents:', error)
    throw error
  }
}

cleanupVehicleDocs()
  .then(() => {
    console.log('\nCleanup completed successfully')
    process.exit(0)
  })
  .catch(error => {
    console.error('\nCleanup failed:', error)
    process.exit(1)
  })
