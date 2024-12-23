import { collection, doc, setDoc } from 'firebase/firestore';
import { db } from './firebase';

const seedReferenceData = async () => {
  // Departments
  const departments = [
    { id: 'eng', name: 'Engineering', isActive: true },
    { id: 'ops', name: 'Operations', isActive: true },
    { id: 'fin', name: 'Finance', isActive: true },
    { id: 'hr', name: 'Human Resources', isActive: true },
    { id: 'it', name: 'Information Technology', isActive: true }
  ];

  // Project Categories
  const projectCategories = [
    { id: 'capex', name: 'Capital Expenditure', isActive: true },
    { id: 'opex', name: 'Operating Expenditure', isActive: true },
    { id: 'maint', name: 'Maintenance', isActive: true },
    { id: 'supp', name: 'Supplies', isActive: true },
    { id: 'tech', name: 'Technology', isActive: true }
  ];

  // Sites
  const sites = [
    { id: 'maseru', name: 'Maseru HQ', isActive: true, organization: '1PWR LESOTHO' },
    { id: 'teyateyaneng', name: 'Teyateyaneng', isActive: true, organization: '1PWR LESOTHO' },
    { id: 'mafeteng', name: 'Mafeteng', isActive: true, organization: '1PWR LESOTHO' }
  ];

  // Expense Types
  const expenseTypes = [
    { id: 'vehicle', name: 'Vehicle', code: 'VEHICLE', isActive: true },
    { id: 'equipment', name: 'Equipment', code: 'EQUIPMENT', isActive: true },
    { id: 'supplies', name: 'Supplies', code: 'SUPPLIES', isActive: true },
    { id: 'services', name: 'Services', code: 'SERVICES', isActive: true },
    { id: 'travel', name: 'Travel', code: 'TRAVEL', isActive: true }
  ];

  // Vehicles
  const vehicles = [
    { id: 'v001', name: 'Toyota Hilux (ABC123)', isActive: true, organization: '1PWR LESOTHO' },
    { id: 'v002', name: 'Ford Ranger (XYZ789)', isActive: true, organization: '1PWR LESOTHO' },
    { id: 'v003', name: 'Isuzu D-Max (DEF456)', isActive: true, organization: '1PWR LESOTHO' }
  ];

  // Vendors
  const vendors = [
    { id: 'v001', name: 'Toyota Lesotho', isActive: true, organization: '1PWR LESOTHO' },
    { id: 'v002', name: 'Imperial Fleet Services', isActive: true, organization: '1PWR LESOTHO' },
    { id: 'v003', name: 'Office National', isActive: true, organization: '1PWR LESOTHO' },
    { id: 'v004', name: 'Vodacom Business', isActive: true, organization: '1PWR LESOTHO' }
  ];

  // Currencies
  const currencies = [
    { id: 'lsl', name: 'Lesotho Loti', code: 'LSL', isActive: true },
    { id: 'zar', name: 'South African Rand', code: 'ZAR', isActive: true },
    { id: 'usd', name: 'US Dollar', code: 'USD', isActive: true },
    { id: 'eur', name: 'Euro', code: 'EUR', isActive: true },
    { id: 'gbp', name: 'British Pound', code: 'GBP', isActive: true }
  ];

  try {
    // Seed Departments
    const departmentsCol = collection(db, 'departments');
    for (const dept of departments) {
      await setDoc(doc(departmentsCol, dept.id), dept);
    }

    // Seed Project Categories
    const projectCategoriesCol = collection(db, 'projectCategories');
    for (const category of projectCategories) {
      await setDoc(doc(projectCategoriesCol, category.id), category);
    }

    // Seed Sites
    const sitesCol = collection(db, 'sites');
    for (const site of sites) {
      await setDoc(doc(sitesCol, site.id), site);
    }

    // Seed Expense Types
    const expenseTypesCol = collection(db, 'expenseTypes');
    for (const type of expenseTypes) {
      await setDoc(doc(expenseTypesCol, type.id), type);
    }

    // Seed Vehicles
    const vehiclesCol = collection(db, 'vehicles');
    for (const vehicle of vehicles) {
      await setDoc(doc(vehiclesCol, vehicle.id), vehicle);
    }

    // Seed Vendors
    const vendorsCol = collection(db, 'vendors');
    for (const vendor of vendors) {
      await setDoc(doc(vendorsCol, vendor.id), vendor);
    }

    // Seed Currencies
    const currenciesCol = collection(db, 'currencies');
    for (const currency of currencies) {
      await setDoc(doc(currenciesCol, currency.id), currency);
    }

    console.log('Successfully seeded reference data');
  } catch (error) {
    console.error('Error seeding reference data:', error);
  }
};

export default seedReferenceData;
