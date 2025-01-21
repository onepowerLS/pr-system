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

interface ExpenseTypeData {
  id: string;
  name: string;
  code: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  organization?: {
    id: string;
    name: string;
  };
  organizationId?: string;
}

async function normalizeExpenseTypeOrganizations() {
  try {
    const expenseTypesRef = db.collection('referenceData_expenseTypes');
    const snapshot = await expenseTypesRef.get();
    
    console.log('=== Normalizing Expense Type Organizations ===');
    console.log(`Total documents to process: ${snapshot.size}`);
    
    const batch = db.batch();
    let updateCount = 0;

    for (const doc of snapshot.docs) {
      const expenseType = doc.data() as ExpenseTypeData;
      const expenseTypeRef = expenseTypesRef.doc(doc.id);

      // If expense type has organization object, convert to organizationId
      if (expenseType.organization?.id && !expenseType.organizationId) {
        console.log(`Converting expense type ${doc.id} from organization object to organizationId`);
        
        const updates = {
          organizationId: expenseType.organization.id,
          organization: null // Remove the old format
        };

        batch.update(expenseTypeRef, updates);
        updateCount++;
      }
    }

    if (updateCount > 0) {
      await batch.commit();
      console.log(`\nSuccessfully updated ${updateCount} expense types`);
    } else {
      console.log('\nNo expense types needed updating');
    }
  } catch (error) {
    console.error('Error normalizing expense type organizations:', error);
    process.exit(1);
  }
}

normalizeExpenseTypeOrganizations()
  .then(() => {
    console.log('\nNormalization completed successfully');
    process.exit(0);
  })
  .catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });
