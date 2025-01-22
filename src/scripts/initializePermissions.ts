import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, setDoc } from 'firebase/firestore';
import { PERMISSION_LEVELS, PERMISSION_NAMES } from '../config/permissions';

// Initialize Firebase (make sure to use your config)
const app = initializeApp({
  // Your config will be loaded from environment variables
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
});

const db = getFirestore(app);

const permissions = [
  {
    code: 'ADMIN',
    name: PERMISSION_NAMES[PERMISSION_LEVELS.ADMIN],
    description: 'Full system access with all administrative privileges',
    level: PERMISSION_LEVELS.ADMIN,
    actions: ['read', 'write', 'delete', 'approve', 'admin'],
    scope: ['global'],
    active: true,
    createdAt: new Date().toISOString(),
  },
  {
    code: 'APPROVER',
    name: PERMISSION_NAMES[PERMISSION_LEVELS.APPROVER],
    description: 'Can approve requests within assigned organizations',
    level: PERMISSION_LEVELS.APPROVER,
    actions: ['read', 'write', 'approve'],
    scope: ['organization'],
    active: true,
    createdAt: new Date().toISOString(),
  },
  {
    code: 'PROC',
    name: PERMISSION_NAMES[PERMISSION_LEVELS.PROC],
    description: 'Can manage procurement process and vendor relationships',
    level: PERMISSION_LEVELS.PROC,
    actions: ['read', 'write', 'process'],
    scope: ['organization'],
    active: true,
    createdAt: new Date().toISOString(),
  },
  {
    code: 'FIN_AD',
    name: PERMISSION_NAMES[PERMISSION_LEVELS.FIN_AD],
    description: 'Can process financial aspects of procurement requests',
    level: PERMISSION_LEVELS.FIN_AD,
    actions: ['read', 'write', 'process'],
    scope: ['organization'],
    active: true,
    createdAt: new Date().toISOString(),
  },
  {
    code: 'REQ',
    name: PERMISSION_NAMES[PERMISSION_LEVELS.REQ],
    description: 'Can create and submit procurement requests',
    level: PERMISSION_LEVELS.REQ,
    actions: ['read', 'write'],
    scope: ['organization'],
    active: true,
    createdAt: new Date().toISOString(),
  },
];

async function initializePermissions() {
  try {
    const permissionsRef = collection(db, 'rd_permissions');
    
    for (const permission of permissions) {
      const docId = permission.code.toLowerCase();
      await setDoc(doc(permissionsRef, docId), permission);
      console.log(`Added permission: ${permission.name}`);
    }
    
    console.log('All permissions initialized successfully');
  } catch (error) {
    console.error('Error initializing permissions:', error);
  }
}

// Run the initialization
initializePermissions().then(() => {
  console.log('Initialization complete');
  process.exit(0);
}).catch((error) => {
  console.error('Initialization failed:', error);
  process.exit(1);
});
