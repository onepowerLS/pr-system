import { parse } from 'csv-parse';
import { createReadStream } from 'fs';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, cert } from 'firebase-admin/app';
import { ReferenceDataItem } from '../src/types/referenceData';

// Initialize Firebase Admin
const serviceAccount = require('../firebase-service-account.json');

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

interface VendorCSV {
  Code: string;
  Name: string;
  Approved: string;
  'Products/Services': string;
  'Contact Name': string;
  'Contact Phone': string;
  'Contact Email': string;
  'Website URL': string;
  City: string;
  Country: string;
  Notes: string;
}

function generateCodeFromName(name: string): string {
  // Convert name to uppercase, remove special characters, and replace spaces with underscores
  return name.toUpperCase()
    .replace(/[^A-Z0-9\s]/g, '')
    .replace(/\s+/g, '_')
    .substring(0, 20); // Limit length to 20 characters
}

function sanitizeString(str: string | undefined): string {
  if (!str) return '';
  return str.trim();
}

async function importVendors() {
  const vendors: VendorCSV[] = [];
  
  // Parse CSV file
  await new Promise((resolve, reject) => {
    createReadStream('/Users/mattmso/Projects/pr-system/Vendors.csv')
      .pipe(parse({
        columns: (headers: string[]) => {
          // Remove BOM character from first column name
          headers[0] = headers[0].replace(/^\uFEFF/, '');
          return headers;
        },
        skip_empty_lines: true,
        trim: true,
        cast: (value, context) => {
          // Convert numeric codes to padded strings
          if (context.column === 'Code' && value) {
            const paddedCode = value.toString().padStart(4, '0');
            return paddedCode;
          }
          return value;
        }
      }))
      .on('data', (data: VendorCSV) => {
        vendors.push(data);
      })
      .on('end', resolve)
      .on('error', reject);
  });

  console.log(`Found ${vendors.length} vendors to import`);

  // Get existing vendors to check for duplicates
  const vendorsCollection = db.collection('referenceData_vendors');
  const existingVendors = await vendorsCollection.get();
  const existingCodes = new Set(existingVendors.docs.map(doc => doc.data().code));

  // Convert and import vendors to Firestore
  let successCount = 0;
  let errorCount = 0;
  let skippedCount = 0;

  for (const vendor of vendors) {
    try {
      const code = vendor.Code;
      
      // Skip if code is missing
      if (!code) {
        console.warn('Skipping vendor with missing code:', vendor.Name);
        skippedCount++;
        continue;
      }

      // Skip if code already exists
      if (existingCodes.has(code)) {
        console.warn(`Skipping vendor with duplicate code ${code}:`, vendor.Name);
        skippedCount++;
        continue;
      }

      const vendorData: ReferenceDataItem = {
        id: code,
        code,
        name: sanitizeString(vendor.Name) || 'Unknown Vendor',
        approved: vendor.Approved?.toUpperCase() === 'TRUE',
        productsServices: sanitizeString(vendor['Products/Services']),
        contactName: sanitizeString(vendor['Contact Name']),
        contactPhone: sanitizeString(vendor['Contact Phone']),
        contactEmail: sanitizeString(vendor['Contact Email']),
        url: sanitizeString(vendor['Website URL']),
        city: sanitizeString(vendor.City),
        country: sanitizeString(vendor.Country),
        notes: sanitizeString(vendor.Notes),
        isActive: true
      };

      // Add to Firestore using code as document ID
      await vendorsCollection.doc(code).set(vendorData);
      console.log(`Imported vendor: ${vendorData.name} (${code})`);
      successCount++;
      existingCodes.add(code);

    } catch (error) {
      console.error(`Error importing vendor:`, vendor, error);
      errorCount++;
    }
  }

  console.log('\nImport Summary:');
  console.log(`Successfully imported: ${successCount}`);
  console.log(`Skipped (duplicates/missing code): ${skippedCount}`);
  console.log(`Failed to import: ${errorCount}`);
}

importVendors().catch(console.error);
