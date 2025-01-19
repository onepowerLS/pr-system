import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const scriptDir = dirname(__filename);
const projectRoot = dirname(dirname(scriptDir));

// Initialize Firebase Admin
const serviceAccount = JSON.parse(
  readFileSync(join(projectRoot, 'firebase-service-account.json'), 'utf8')
);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = getFirestore();

interface OrganizationData {
  id: string;
  name: string;
}

async function migrateCollection(collectionName: string) {
  console.log(`Migrating collection: ${collectionName}`);
  const snapshot = await db.collection(collectionName).get();
  const batch = db.batch();
  let updateCount = 0;

  for (const doc of snapshot.docs) {
    const data = doc.data();
    let needsUpdate = false;
    const updates: any = {};

    // Add timestamps if missing
    if (!data.createdAt) {
      updates.createdAt = new Date().toISOString();
      needsUpdate = true;
    }
    if (!data.updatedAt) {
      updates.updatedAt = new Date().toISOString();
      needsUpdate = true;
    }

    // Convert string organization to object format
    if (data.organization && typeof data.organization === 'string') {
      updates.organization = {
        id: data.organization,
        name: data.organization.toUpperCase()
      };
      needsUpdate = true;
    }

    // Add active flag if missing
    if (data.active === undefined) {
      updates.active = true;
      needsUpdate = true;
    }

    if (needsUpdate) {
      batch.update(doc.ref, updates);
      updateCount++;
    }

    // Commit batch when it reaches 500 operations
    if (updateCount >= 500) {
      await batch.commit();
      console.log(`Committed batch of ${updateCount} updates`);
      updateCount = 0;
    }
  }

  // Commit any remaining updates
  if (updateCount > 0) {
    await batch.commit();
    console.log(`Committed final batch of ${updateCount} updates`);
  }
}

async function runMigration() {
  try {
    const collections = [
      'referenceData_departments',
      'referenceData_projectCategories',
      'referenceData_sites',
      'referenceData_expenseTypes',
      'referenceData_vehicles',
      'referenceData_vendors',
      'referenceData_organizations',
      'referenceData_currencies',
      'referenceData_uom',
      'referenceData_permissions'
    ];

    for (const collection of collections) {
      await migrateCollection(collection);
    }

    console.log('Migration completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error during migration:', error);
    process.exit(1);
  }
}

runMigration();
