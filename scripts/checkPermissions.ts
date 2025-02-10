import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';

const firebaseConfig = {
  apiKey: 'AIzaSyD0tA1fvWs5dCr-7JqJv_bxlay2Bhs72jQ',
  authDomain: 'pr-system-4ea55.firebaseapp.com',
  projectId: 'pr-system-4ea55',
  storageBucket: 'pr-system-4ea55.firebasestorage.app',
  messagingSenderId: '562987209098',
  appId: '1:562987209098:web:2f788d189f1c0867cb3873',
  measurementId: 'G-ZT7LN4XP80'
};

async function checkPermissions() {
  try {
    // Initialize Firebase
    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);
    const db = getFirestore(app);

    // Sign in
    console.log('Signing in...');
    await signInWithEmailAndPassword(auth, 'mso@1pwrafrica.com', '1PWR00');
    console.log('Successfully signed in');

    // Get permissions collection
    console.log('Fetching permissions from referenceData_permissions...');
    const permissionsRef = collection(db, 'referenceData_permissions');
    const querySnapshot = await getDocs(permissionsRef);

    console.log('\nTotal permissions found:', querySnapshot.size);
    
    // Print each permission
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      console.log('\nPermission:', {
        id: doc.id,
        ...data,
        level: Number(data.level)
      });
    });

  } catch (error) {
    console.error('Error:', error);
  }
}

// Run the check
checkPermissions();
