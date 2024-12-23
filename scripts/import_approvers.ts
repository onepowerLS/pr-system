import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as xlsx from 'xlsx';
import * as path from 'path';

// Initialize Firebase Admin with service account
const serviceAccount = require('../firebase-service-account.json');
const app = initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore(app);

async function importApprovers() {
  try {
    // Read the Excel file
    const workbook = xlsx.readFile('1PWR pr-system.xlsx');
    const sheet = workbook.Sheets['Approver List'];
    if (!sheet) {
      throw new Error('Approver List sheet not found');
    }

    // Convert sheet to JSON
    const approvers = xlsx.utils.sheet_to_json(sheet);
    console.log(`Found ${approvers.length} approvers in Excel`);

    // Clear existing approvers
    const approversRef = db.collection('approvers');
    const existingApprovers = await approversRef.get();
    const batch = db.batch();
    existingApprovers.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    await batch.commit();
    console.log('Cleared existing approvers');

    // Import new approvers
    console.log('Importing approvers...');
    for (const approver of approvers) {
      const id = approver['Email']?.toLowerCase().replace(/[^a-z0-9]/g, '') || 
                approver['Name']?.toLowerCase().replace(/[^a-z0-9]/g, '');
      
      if (!id) {
        console.warn('Skipping approver with no email or name:', approver);
        continue;
      }

      const approverData = {
        id,
        name: approver['Name'] || '',
        email: approver['Email'] || '',
        department: approver['Department'] || '',
        role: approver['Role'] || 'USER',
        isActive: true,
        approvalLimit: parseFloat(approver['Approval Limit'] || '0')
      };

      console.log(`Creating approver: ${approverData.name}`);
      await approversRef.doc(id).set(approverData);
    }

    console.log('Approvers imported successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error importing approvers:', error);
    process.exit(1);
  }
}

// Add error handler for unhandled rejections
process.on('unhandledRejection', (error) => {
  console.error('Unhandled rejection:', error);
  process.exit(1);
});

importApprovers();
