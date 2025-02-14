import 'dotenv/config'
import { db, signIn } from './firebase'
import { collection, doc, setDoc } from 'firebase/firestore'

const COLLECTION_PREFIX = 'referenceData'

// Organizations seed data
const organizations = [
  { 
    id: '1pwr_lesotho',
    code: '1PWR_LSO',
    name: '1PWR LESOTHO',
    shortName: '1PWR LSO',
    country: 'Lesotho',
    timezone: 'Africa/Maseru',
    currency: 'LSL',
    active: true
  },
  { 
    id: '1pwr_benin',
    code: '1PWR_BEN',
    name: '1PWR BENIN',
    shortName: '1PWR BEN',
    country: 'Benin',
    timezone: 'Africa/Porto-Novo',
    currency: 'XOF',
    active: true
  },
  { 
    id: '1pwr_zambia',
    code: '1PWR_ZAM',
    name: '1PWR ZAMBIA',
    shortName: '1PWR ZAM',
    country: 'Zambia',
    timezone: 'Africa/Lusaka',
    currency: 'ZMW',
    active: false
  },
  { 
    id: 'pueco_lesotho',
    code: 'PUECO_LSO',
    name: 'PUECO LESOTHO',
    shortName: 'PUECO LSO',
    country: 'Lesotho',
    timezone: 'Africa/Maseru',
    currency: 'LSL',
    active: true
  },
  { 
    id: 'pueco_benin',
    code: 'PUECO_BEN',
    name: 'PUECO BENIN',
    shortName: 'PUECO BEN',
    country: 'Benin',
    timezone: 'Africa/Porto-Novo',
    currency: 'XOF',
    active: false
  },
  { 
    id: 'neo1',
    code: 'NEO1',
    name: 'NEO1',
    shortName: 'NEO1',
    country: 'Lesotho',
    timezone: 'Africa/Maseru',
    currency: 'LSL',
    active: true
  },
  { 
    id: 'smp',
    code: 'SMP',
    name: 'SMP',
    shortName: 'SMP',
    country: 'Lesotho',
    timezone: 'Africa/Maseru',
    currency: 'LSL',
    active: true
  }
]

// Permissions seed data
const permissions = [
  {
    id: 'admin',
    code: 'ADMIN',
    name: 'Administrator',
    description: 'Full system access',
    level: 1,
    actions: ['*'],
    scope: ['*'],
    active: true
  },
  {
    id: 'procurement_manager',
    code: 'PROC_MGR',
    name: 'Procurement Manager',
    description: 'Can manage procurement process',
    level: 2,
    actions: ['create', 'read', 'update', 'delete', 'approve'],
    scope: ['pr', 'po', 'vendors'],
    active: true
  },
  {
    id: 'procurement_officer',
    code: 'PROC_OFF',
    name: 'Procurement Officer',
    description: 'Can process procurement requests',
    level: 3,
    actions: ['create', 'read', 'update'],
    scope: ['pr', 'po'],
    active: true
  },
  {
    id: 'department_head',
    code: 'DEPT_HEAD',
    name: 'Department Head',
    description: 'Can approve department requests',
    level: 4,
    actions: ['read', 'approve'],
    scope: ['pr'],
    active: true
  },
  {
    id: 'requester',
    code: 'REQ',
    name: 'Requester',
    description: 'Can create and view requests',
    level: 5,
    actions: ['create', 'read'],
    scope: ['pr'],
    active: true
  }
]

async function seedReferenceData() {
  try {
    // Sign in first
    await signIn()
    console.log('Authentication successful')

    // Seed organizations
    console.log('Seeding organizations...')
    for (const org of organizations) {
      const docRef = doc(db, `${COLLECTION_PREFIX}_organizations`, org.id)
      await setDoc(docRef, {
        ...org,
        createdAt: new Date().toISOString()
      })
      console.log(`Added organization: ${org.name}`)
    }

    // Seed permissions
    console.log('Seeding permissions...')
    for (const perm of permissions) {
      const docRef = doc(db, `${COLLECTION_PREFIX}_permissions`, perm.id)
      await setDoc(docRef, {
        ...perm,
        createdAt: new Date().toISOString()
      })
      console.log(`Added permission: ${perm.name}`)
    }

    console.log('Reference data seeding complete!')
  } catch (error) {
    console.error('Error seeding reference data:', error)
  }
}

// Run the seed function
seedReferenceData()
