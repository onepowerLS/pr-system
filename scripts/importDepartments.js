const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
const csv = require('csv-parse/sync');
const serviceAccount = require(path.join(__dirname, '..', 'firebase-service-account.json'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const COLLECTION_NAME = 'referenceData_departments';

async function importDepartments() {
  try {
    // Read and parse CSV file
    const csvPath = path.join(__dirname, '../Departments.csv');
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
    console.log('Cleared existing departments');

    // Create new batch for imports
    const importBatch = db.batch();
    
    // Process each record
    records.forEach((record) => {
      const departmentName = record['Department Name'];
      if (!departmentName) {
        console.warn('Skipping record with no department name:', record);
        return;
      }

      const departmentId = departmentName
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '_') // Replace non-alphanumeric chars with underscore
        .replace(/^_+|_+$/g, ''); // Remove leading/trailing underscores

      const docRef = db.collection(COLLECTION_NAME).doc(departmentId);
      
      // Convert CSV data to Firestore document format
      const department = {
        name: departmentName.trim(),
        organization: {
          name: record['Organization'].trim(),
          id: record['Organization ID'].trim()
        },
        active: record['Active Status (Y/N)'].toUpperCase().trim() === 'Y',
        id: departmentId
      };
      
      console.log('Adding department:', department);
      importBatch.set(docRef, department);
    });

    // Commit the batch
    await importBatch.commit();
    console.log(`Successfully imported ${records.length} departments`);
    process.exit(0);
    
  } catch (error) {
    console.error('Error importing departments:', error);
    process.exit(1);
  }
}

// Run the import
importDepartments();
