import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as path from 'path';

// Initialize Firebase Admin with service account
const serviceAccount = require('../firebase-service-account.json');
const app = initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore(app);

const vendors = [
  {
    id: 'vendor1',
    name: 'Approved Hardware Supplier',
    email: 'sales@hardware.com',
    isApproved: true,
    category: 'Hardware',
    paymentTerms: 'Net 30',
    createdAt: new Date().toISOString()
  },
  {
    id: 'vendor2',
    name: 'General Office Supplies',
    email: 'sales@officesupplies.com',
    isApproved: false,
    category: 'Office Supplies',
    paymentTerms: 'Net 15',
    createdAt: new Date().toISOString()
  },
  {
    id: 'vendor3',
    name: 'Premium IT Solutions',
    email: 'sales@itsolutions.com',
    isApproved: true,
    category: 'IT Equipment',
    paymentTerms: 'Net 30',
    createdAt: new Date().toISOString()
  }
];

async function seedTestData() {
  try {
    // Seed vendors only, preserve existing approvers
    console.log('Seeding vendors...');
    for (const vendor of vendors) {
      console.log(`Creating vendor: ${vendor.name}`);
      await db.collection('vendors').doc(vendor.id).set(vendor);
    }
    console.log('Vendors seeded successfully');

    console.log('All test data seeded successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding test data:', error);
    process.exit(1);
  }
}

// Add error handler for unhandled rejections
process.on('unhandledRejection', (error) => {
  console.error('Unhandled rejection:', error);
  process.exit(1);
});

seedTestData();
