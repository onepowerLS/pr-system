const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
const csv = require('csv-parse/sync');
const serviceAccount = require(path.join(__dirname, '..', 'firebase-service-account.json'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const COLLECTION_PREFIX = 'referenceData';
const DEFAULT_ORGANIZATION = '1pwr_lesotho'; // Default organization

function generateId(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

async function importFromCsv(type, csvPath, options = {}) {
  const collectionName = `${COLLECTION_PREFIX}_${type}`;
  console.log(`\nImporting ${type} from ${csvPath}...`);

  try {
    // Read and parse CSV file
    const fileContent = fs.readFileSync(csvPath, 'utf-8');
    const records = csv.parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      bom: true
    });

    console.log(`Parsed ${records.length} records from CSV`);

    // Clear existing collection
    const snapshot = await db.collection(collectionName).get();
    const batch = db.batch();
    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });
    await batch.commit();
    console.log(`Cleared existing ${type}`);

    // Create new batch for imports
    const importBatch = db.batch();

    // Process each record
    records.forEach((record) => {
      const item = {
        organization: DEFAULT_ORGANIZATION // Add default organization to all items
      };
      
      // Map CSV columns to Firestore fields based on type
      switch (type) {
        case 'vehicles':
          item.name = record['Vehicle Designation'];
          item.code = record['Registration Status'] || '';
          item.active = record['Active (Y/N)'].toUpperCase() === 'Y';
          break;
        case 'sites':
          item.name = record['Site Name'];
          item.code = record['Code'];
          item.active = record['Active (Y/N)'].toUpperCase() === 'Y';
          break;
        case 'departments':
          item.name = record['Department Name'];
          item.active = record['Active Status (Y/N)'].toUpperCase() === 'Y';
          break;
        case 'projectCategories':
          item.name = record['Category'];
          item.active = record['Active (Y/N)'].toUpperCase() === 'Y';
          break;
        case 'expenseTypes':
          item.name = record['Expense Type'];
          item.code = record['Code'];
          item.active = record['Active (Y/N)'].toUpperCase() === 'Y';
          break;
        case 'vendors':
          item.organization = ''; // Set empty string for vendors to indicate organization-independent
          item.name = record['Vendor Name'];
          item.active = record['Approved Status (Y/N)']?.toUpperCase() === 'Y' || false; // Default to false if missing
          item.approvalDate = record['Approval Date'];
          item.contactName = record['Contact Name'] || '';
          item.contactEmail = record['Contact Email'] || '';
          item.contactPhone = record['Contact Phone'] || '';
          item.address = record['Address'] || '';
          item.url = record['URL'] || '';
          item.notes = record['Notes'] || '';
          break;
        default:
          console.warn(`Unknown type: ${type}`);
          return;
      }

      // Generate ID from name
      const id = generateId(item.name);
      const docRef = db.collection(collectionName).doc(id);
      
      console.log(`Adding ${type}:`, item);
      importBatch.set(docRef, { id, ...item });
    });

    // Commit the batch
    await importBatch.commit();
    console.log(`Successfully imported ${records.length} ${type}`);
  } catch (error) {
    console.error(`Error importing ${type}:`, error);
    process.exit(1);
  }
}

async function importAllReferenceData() {
  try {
    // Import each type from its CSV file
    await importFromCsv('vehicles', path.join(__dirname, '..', 'Vehicle.csv'));
    await importFromCsv('sites', path.join(__dirname, '..', 'Sites.csv'));
    await importFromCsv('departments', path.join(__dirname, '..', 'Departments.csv'));
    await importFromCsv('projectCategories', path.join(__dirname, '..', 'Project Categories.csv'));
    await importFromCsv('expenseTypes', path.join(__dirname, '..', 'Expense Type.csv'));
    await importFromCsv('vendors', path.join(__dirname, '..', 'Vendor.csv'));

    console.log('\nAll reference data imported successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error importing reference data:', error);
    process.exit(1);
  }
}

// Run the import
importAllReferenceData();
