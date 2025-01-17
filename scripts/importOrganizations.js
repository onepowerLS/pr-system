const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
const csv = require('csv-parse/sync');
const serviceAccount = require(path.join(__dirname, '..', 'firebase-service-account.json'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const COLLECTION_NAME = 'referenceData_organizations';

async function importOrganizations() {
  try {
    // Read and parse CSV file
    const csvPath = path.join(__dirname, '..', 'Organization.csv');
    const fileContent = fs.readFileSync(csvPath, 'utf-8');
    
    // Parse CSV synchronously
    const records = csv.parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      bom: true // Handle BOM character
    });

    console.log('Parsed records:', records);

    // Clear existing collection
    const snapshot = await db.collection(COLLECTION_NAME).get();
    const batch = db.batch();
    
    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });
    
    await batch.commit();
    console.log('Cleared existing organizations');

    // Create new batch for imports
    const importBatch = db.batch();
    
    // Process each record
    records.forEach((record) => {
      const orgName = record['Organization'];
      if (!orgName) {
        console.warn('Skipping record with no organization name:', record);
        return;
      }

      const orgId = orgName
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '_') // Replace non-alphanumeric chars with underscore
        .replace(/^_+|_+$/g, ''); // Remove leading/trailing underscores

      const docRef = db.collection(COLLECTION_NAME).doc(orgId);
      
      // Convert CSV data to Firestore document format
      const organization = {
        name: orgName.trim(),
        active: record['Active (Y/N)'].toUpperCase().trim() === 'Y',
        id: orgId
      };
      
      console.log('Adding organization:', organization);
      importBatch.set(docRef, organization);
    });

    // Commit the batch
    await importBatch.commit();
    console.log(`Successfully imported ${records.length} organizations`);
    process.exit(0);
    
  } catch (error) {
    console.error('Error importing organizations:', error);
    process.exit(1);
  }
}

// Run the import
importOrganizations();
