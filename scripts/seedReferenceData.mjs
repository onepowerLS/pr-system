import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, setDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBKvwmXE3KmyNSxpBxlGAg4OGhZKUAJNqc",
  authDomain: "pr-system-1pwrafrica.firebaseapp.com",
  projectId: "pr-system-1pwrafrica",
  storageBucket: "pr-system-1pwrafrica.appspot.com",
  messagingSenderId: "1066513417481",
  appId: "1:1066513417481:web:e5c4f1e4e4a8f1e1e4a8f1"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const COLLECTION_PREFIX = 'referenceData';

async function seedReferenceData() {
  // Departments
  const departments = [
    { id: 'eng', name: 'Engineering', active: true },
    { id: 'ops', name: 'Operations', active: true },
    { id: 'fin', name: 'Finance', active: true },
    { id: 'hr', name: 'Human Resources', active: true },
    { id: 'it', name: 'Information Technology', active: true }
  ];

  // Project Categories
  const projectCategories = [
    { id: 'capex', name: 'Capital Expenditure', active: true },
    { id: 'opex', name: 'Operating Expenditure', active: true },
    { id: 'maint', name: 'Maintenance', active: true },
    { id: 'supp', name: 'Supplies', active: true },
    { id: 'tech', name: 'Technology', active: true }
  ];

  // Sites
  const sites = [
    { id: 'maseru', name: 'Maseru HQ', active: true, organization: '1PWR LESOTHO' },
    { id: 'teyateyaneng', name: 'Teyateyaneng', active: true, organization: '1PWR LESOTHO' },
    { id: 'mafeteng', name: 'Mafeteng', active: true, organization: '1PWR LESOTHO' }
  ];

  // Expense Types
  const expenseTypes = [
    { id: 'vehicle', name: 'Vehicle', code: 'VEHICLE', active: true },
    { id: 'equipment', name: 'Equipment', code: 'EQUIPMENT', active: true },
    { id: 'supplies', name: 'Supplies', code: 'SUPPLIES', active: true },
    { id: 'services', name: 'Services', code: 'SERVICES', active: true },
    { id: 'travel', name: 'Travel', code: 'TRAVEL', active: true }
  ];

  // Vehicles
  const vehicles = [
    { id: 'v001', name: 'Toyota Hilux (ABC123)', active: true, organization: '1PWR LESOTHO' },
    { id: 'v002', name: 'Ford Ranger (XYZ789)', active: true, organization: '1PWR LESOTHO' },
    { id: 'v003', name: 'Isuzu D-Max (DEF456)', active: true, organization: '1PWR LESOTHO' }
  ];

  // Vendors
  const vendors = [
    { id: 'v001', name: 'Toyota Lesotho', active: true, organization: '1PWR LESOTHO' },
    { id: 'v002', name: 'Imperial Fleet Services', active: true, organization: '1PWR LESOTHO' },
    { id: 'v003', name: 'Office National', active: true, organization: '1PWR LESOTHO' },
    { id: 'v004', name: 'Vodacom Business', active: true, organization: '1PWR LESOTHO' }
  ];

  // Currencies
  const currencies = [
    { id: 'lsl', name: 'Lesotho Loti', code: 'LSL', active: true },
    { id: 'zar', name: 'South African Rand', code: 'ZAR', active: true },
    { id: 'usd', name: 'US Dollar', code: 'USD', active: true },
    { id: 'eur', name: 'Euro', code: 'EUR', active: true },
    { id: 'gbp', name: 'British Pound', code: 'GBP', active: true }
  ];

  try {
    // Seed Departments
    const departmentsCol = collection(db, `${COLLECTION_PREFIX}_departments`);
    for (const dept of departments) {
      await setDoc(doc(departmentsCol, dept.id), dept);
    }

    // Seed Project Categories
    const projectCategoriesCol = collection(db, `${COLLECTION_PREFIX}_projectCategories`);
    for (const category of projectCategories) {
      await setDoc(doc(projectCategoriesCol, category.id), category);
    }

    // Seed Sites
    const sitesCol = collection(db, `${COLLECTION_PREFIX}_sites`);
    for (const site of sites) {
      await setDoc(doc(sitesCol, site.id), site);
    }

    // Seed Expense Types
    const expenseTypesCol = collection(db, `${COLLECTION_PREFIX}_expenseTypes`);
    for (const type of expenseTypes) {
      await setDoc(doc(expenseTypesCol, type.id), type);
    }

    // Seed Vehicles
    const vehiclesCol = collection(db, `${COLLECTION_PREFIX}_vehicles`);
    for (const vehicle of vehicles) {
      await setDoc(doc(vehiclesCol, vehicle.id), vehicle);
    }

    // Seed Vendors
    const vendorsCol = collection(db, `${COLLECTION_PREFIX}_vendors`);
    for (const vendor of vendors) {
      await setDoc(doc(vendorsCol, vendor.id), vendor);
    }

    // Seed Currencies
    const currenciesCol = collection(db, `${COLLECTION_PREFIX}_currencies`);
    for (const currency of currencies) {
      await setDoc(doc(currenciesCol, currency.id), currency);
    }

    console.log('Successfully seeded reference data');
  } catch (error) {
    console.error('Error seeding reference data:', error);
    throw error;
  }
}

seedReferenceData().catch(console.error);
