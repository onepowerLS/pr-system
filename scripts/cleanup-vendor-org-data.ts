import { initializeApp } from "firebase/app"
import { getFirestore, collection, getDocs, updateDoc, doc, deleteField } from "firebase/firestore"
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

async function cleanupVendorOrgData() {
  const collectionName = "referenceData_vendors"
  console.log(`Starting cleanup of organization data from ${collectionName}...`)

  try {
    const collectionRef = collection(db, collectionName)
    const snapshot = await getDocs(collectionRef)
    
    let updatedCount = 0
    for (const doc_ of snapshot.docs) {
      const data = doc_.data()
      if (data.organizationId || data.organization) {
        console.log(`Removing organization data from vendor: ${doc_.id}`)
        await updateDoc(doc(db, collectionName, doc_.id), {
          organizationId: deleteField(),
          organization: deleteField()
        })
        updatedCount++
      }
    }
    
    console.log(`Successfully cleaned up ${updatedCount} vendors`)
  } catch (error) {
    console.error('Error cleaning up vendor organization data:', error)
    throw error
  }
}

cleanupVendorOrgData()
  .then(() => {
    console.log('Cleanup completed successfully')
    process.exit(0)
  })
  .catch(error => {
    console.error('Cleanup failed:', error)
    process.exit(1)
  })
