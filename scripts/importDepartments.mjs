import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, writeBatch, doc } from 'firebase/firestore';
import fs from 'fs';
import { parse } from 'csv-parse/sync';  // Use sync parser
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load environment variables
const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: '../.env' });

// Initialize Firebase with environment variables
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const COLLECTION_NAME = 'referenceData_departments';

async function importDepartments() {
  try {
    // Read and parse CSV file
    const csvPath = new URL('../Departments.csv', import.meta.url).pathname;
    const fileContent = fs.readFileSync(csvPath, 'utf-8');
    
    // Parse CSV synchronously
    const records = parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      bom: true // Handle BOM character
    });

    console.log('Parsed records:', records);

    // Clear existing collection
    const existingDocs = await getDocs(collection(db, COLLECTION_NAME));
    const batch = writeBatch(db);
    
    existingDocs.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });
    
    await batch.commit();
    console.log('Cleared existing departments');

    // Create new batch for imports
    const importBatch = writeBatch(db);
    
    // Process each record
    records.forEach((record) => {
      const departmentName = record['Department Name'];
      if (!departmentName) {
        console.warn('Skipping record with no department name:', record);
        return;
      }

      const docRef = doc(collection(db, COLLECTION_NAME));
      
      // Convert CSV data to Firestore document format
      const department = {
        name: departmentName.trim(),
        organization: record['Organization'].trim(),
        active: record['Active Status (Y/N)'].toUpperCase().trim() === 'Y',
        id: departmentName
          .toLowerCase()
          .trim()
          .replace(/[^a-z0-9]+/g, '_') // Replace non-alphanumeric chars with underscore
          .replace(/^_+|_+$/g, '') // Remove leading/trailing underscores
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
