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

async function fixVehicleOrgIds() {
  try {
    const collectionName = "referenceData_vehicles"
    console.log(`\nFixing organization IDs in ${collectionName}...`)
    
    const collectionRef = db.collection(collectionName)
    const snapshot = await collectionRef.get()
    
    console.log(`\nFound ${snapshot.size} vehicles to process`)
    let updatedCount = 0

    for (const doc of snapshot.docs) {
      const data = doc.data()
      const updates: any = {}
      let needsUpdate = false

      // Check if organizationId is missing or different from organization.id
      if (data.organization?.id) {
        const standardizedId = standardizeOrgId(data.organization.id)
        if (!data.organizationId || data.organizationId !== standardizedId) {
          updates.organizationId = standardizedId
          needsUpdate = true
        }
        if (data.organization.id !== standardizedId) {
          updates['organization.id'] = standardizedId
          needsUpdate = true
        }
      }

      if (needsUpdate) {
        console.log(`\nUpdating vehicle ${doc.id}:`)
        console.log('  Current:', {
          organizationId: data.organizationId,
          'organization.id': data.organization?.id
        })
        console.log('  Updates:', updates)

        await doc.ref.update(updates)
        updatedCount++
      }
    }
    
    console.log(`\nUpdated ${updatedCount} vehicles`)
  } catch (error) {
    console.error('Error fixing vehicle organization IDs:', error)
    throw error
  }
}

fixVehicleOrgIds()
  .then(() => {
    console.log('\nFix completed successfully')
    process.exit(0)
  })
  .catch(error => {
    console.error('\nFix failed:', error)
    process.exit(1)
  })
