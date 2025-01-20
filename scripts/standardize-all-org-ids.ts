import { initializeApp } from "firebase/app"
import { getFirestore, collection, getDocs, updateDoc, doc } from "firebase/firestore"
import { getAuth, signInWithEmailAndPassword } from "firebase/auth"
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
const auth = getAuth(app)

function standardizeOrgId(id: string): string {
  return id.toLowerCase().replace(/\s+/g, '_')
}

async function standardizeAllOrgIds() {
  const collectionTypes = ['organizations', 'vehicles', 'sites', 'departments']
  console.log('Starting standardization of organization IDs...')

  try {
    // Sign in with email and password
    await signInWithEmailAndPassword(auth, process.env.VITE_TEST_EMAIL!, process.env.VITE_TEST_PASSWORD!)
    console.log('Successfully signed in')

    for (const type of collectionTypes) {
      const collectionName = `referenceData_${type}`
      console.log(`\nProcessing collection: ${collectionName}...`)
      
      const collectionRef = collection(db, collectionName)
      const snapshot = await getDocs(collectionRef)
      
      let updatedCount = 0
      for (const doc_ of snapshot.docs) {
        const data = doc_.data()
        let needsUpdate = false
        const updates: any = {}
        
        // Check organization ID fields
        if (type === 'organizations') {
          // For organizations collection, standardize their own ID
          if (data.id) {
            const standardizedId = standardizeOrgId(data.id)
            if (standardizedId !== data.id) {
              updates.id = standardizedId
              needsUpdate = true
            }
          }
        } else {
          // For other collections, standardize organizationId and organization.id
          const currentOrgId = data.organizationId || data.organization?.id
          if (currentOrgId) {
            const standardizedId = standardizeOrgId(currentOrgId)
            if (standardizedId !== currentOrgId) {
              updates.organizationId = standardizedId
              if (data.organization) {
                updates.organization = {
                  ...data.organization,
                  id: standardizedId
                }
              }
              needsUpdate = true
            }
          }
        }
        
        if (needsUpdate) {
          console.log(`Updating ${type} ${doc_.id}:`)
          console.log('  Updates:', updates)
          
          await updateDoc(doc(db, collectionName, doc_.id), updates)
          updatedCount++
        }
      }
      
      console.log(`Updated ${updatedCount} items in ${collectionName}`)
    }
  } catch (error) {
    console.error('Error standardizing organization IDs:', error)
    throw error
  }
}

standardizeAllOrgIds()
  .then(() => {
    console.log('\nStandardization completed successfully')
    process.exit(0)
  })
  .catch(error => {
    console.error('\nStandardization failed:', error)
    process.exit(1)
  })
