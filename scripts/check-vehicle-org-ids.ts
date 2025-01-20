import { initializeApp } from "firebase/app"
import { getFirestore, collection, getDocs } from "firebase/firestore"
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

async function checkVehicleOrgIds() {
  const collectionName = "referenceData_vehicles"
  console.log(`\nChecking vehicles in ${collectionName}...`)

  try {
    // Sign in with email and password
    await signInWithEmailAndPassword(auth, process.env.VITE_TEST_EMAIL!, process.env.VITE_TEST_PASSWORD!)
    console.log('Successfully signed in')

    const collectionRef = collection(db, collectionName)
    const snapshot = await getDocs(collectionRef)
    
    console.log(`\nFound ${snapshot.size} vehicles:`)
    snapshot.docs.forEach(doc => {
      const data = doc.data()
      console.log(`\nVehicle ${doc.id}:`)
      console.log('  organizationId:', data.organizationId)
      console.log('  organization:', data.organization)
      console.log('  Full data:', data)
    })
  } catch (error) {
    console.error('Error checking vehicle organization IDs:', error)
    throw error
  }
}

checkVehicleOrgIds()
  .then(() => {
    console.log('\nCheck completed successfully')
    process.exit(0)
  })
  .catch(error => {
    console.error('\nCheck failed:', error)
    process.exit(1)
  })
