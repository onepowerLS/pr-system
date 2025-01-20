import { initializeApp } from "firebase/app"
import { getFirestore, collection, getDocs, updateDoc, doc } from "firebase/firestore"
import { config } from "dotenv"

// Initialize environment variables
config()

// Initialize Firebase
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
  measurementId: process.env.VITE_FIREBASE_MEASUREMENT_ID
}

const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

function standardizeOrgId(id: string): string {
  return id.toLowerCase().replace(/\s+/g, '_')
}

async function standardizeVehicleOrgIds() {
  const collectionName = "referenceData_vehicles"
  console.log(`Starting standardization of vehicle organization IDs in ${collectionName}...`)

  try {
    const collectionRef = collection(db, collectionName)
    const snapshot = await getDocs(collectionRef)
    
    let updatedCount = 0
    for (const doc_ of snapshot.docs) {
      const data = doc_.data()
      const currentOrgId = data.organizationId || data.organization?.id
      
      if (currentOrgId) {
        const standardizedId = standardizeOrgId(currentOrgId)
        
        if (standardizedId !== currentOrgId) {
          console.log(`Updating vehicle ${doc_.id}:`)
          console.log(`  Old organization ID: ${currentOrgId}`)
          console.log(`  New organization ID: ${standardizedId}`)
          
          await updateDoc(doc(db, collectionName, doc_.id), {
            organizationId: standardizedId,
            organization: {
              ...data.organization,
              id: standardizedId
            }
          })
          updatedCount++
        }
      } else {
        console.warn(`Warning: Vehicle ${doc_.id} has no organization ID`)
      }
    }
    
    console.log(`Successfully updated ${updatedCount} vehicles`)
  } catch (error) {
    console.error('Error standardizing vehicle organization IDs:', error)
    throw error
  }
}

standardizeVehicleOrgIds()
  .then(() => {
    console.log('Standardization completed successfully')
    process.exit(0)
  })
  .catch(error => {
    console.error('Standardization failed:', error)
    process.exit(1)
  })
