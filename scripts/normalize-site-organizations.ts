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

interface SiteData {
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

async function normalizeSiteOrganizations() {
  try {
    const sitesRef = db.collection('referenceData_sites');
    const snapshot = await sitesRef.get();
    
    console.log('=== Normalizing Site Organizations ===');
    console.log(`Total documents to process: ${snapshot.size}`);
    
    const batch = db.batch();
    let updateCount = 0;

    for (const doc of snapshot.docs) {
      const site = doc.data() as SiteData;
      const siteRef = sitesRef.doc(doc.id);

      // If site has organization object, convert to organizationId
      if (site.organization?.id && !site.organizationId) {
        console.log(`Converting site ${doc.id} from organization object to organizationId`);
        
        const updates = {
          organizationId: site.organization.id,
          organization: null // Remove the old format
        };

        batch.update(siteRef, updates);
        updateCount++;
      }
    }

    if (updateCount > 0) {
      await batch.commit();
      console.log(`\nSuccessfully updated ${updateCount} sites`);
    } else {
      console.log('\nNo sites needed updating');
    }
  } catch (error) {
    console.error('Error normalizing site organizations:', error);
    process.exit(1);
  }
}

normalizeSiteOrganizations()
  .then(() => {
    console.log('\nNormalization completed successfully');
    process.exit(0);
  })
  .catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });
