import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as xlsx from 'xlsx';
import * as path from 'path';

// Initialize Firebase Admin
const serviceAccount = require('../firebase-service-account.json');
initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

async function importApprovers() {
  try {
    console.log('Reading Excel file...');
    const workbook = xlsx.readFile(path.join(__dirname, '../1PWR pr-system.xlsx'));
    const sheet = workbook.Sheets['Approver List'];
    const approvers = xlsx.utils.sheet_to_json(sheet);

    console.log('Approvers from Excel:', approvers);

    // Delete existing approvers
    console.log('Deleting existing approvers...');
    const approversRef = db.collection('approverList');
    const existingApprovers = await approversRef.get();
    const batch = db.batch();
    existingApprovers.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    await batch.commit();

    // Import new approvers
    console.log('Importing new approvers...');
    const importBatch = db.batch();
    approvers.forEach((approver: any) => {
      const docRef = approversRef.doc();
      importBatch.set(docRef, {
        Name: approver.Name,
        Email: approver.Email,
        Department: approver.Department,
        'Approval Limit': approver['Approval Limit'],
        'Active Status (Y/N)': approver['Active Status (Y/N)'],
        isActive: approver['Active Status (Y/N)'] === 'Y',
        organization: '1PWR LESOTHO',
        createdAt: new Date(),
        updatedAt: new Date()
      });
    });
    await importBatch.commit();

    console.log('Import completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error importing approvers:', error);
    process.exit(1);
  }
}

importApprovers();
