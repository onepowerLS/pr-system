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

async function listExpenseTypes() {
  try {
    const expenseTypesRef = db.collection('referenceData_expenseTypes');
    const snapshot = await expenseTypesRef.get();
    
    console.log('=== Expense Types Collection ===');
    console.log(`Total documents: ${snapshot.size}`);
    console.log('\nExpense Types:');
    
    snapshot.forEach(doc => {
      console.log('\nDocument ID:', doc.id);
      console.log('Data:', doc.data());
    });
  } catch (error) {
    console.error('Error listing expense types:', error);
  }
}

listExpenseTypes()
  .then(() => {
    console.log('\nListing completed successfully');
    process.exit(0);
  })
  .catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });
