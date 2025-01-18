const { initializeApp } = require('firebase/app');
const { getFirestore, collection, query, getDocs, updateDoc, doc } = require('firebase/firestore');
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyD0tA1fvWs5dCr-7JqJv_bxlay2Bhs72jQ",
  authDomain: "pr-system-4ea55.firebaseapp.com",
  projectId: "pr-system-4ea55",
  storageBucket: "pr-system-4ea55.firebasestorage.app",
  messagingSenderId: "562987209098",
  appId: "1:562987209098:web:2f788d189f1c0867cb3873",
  measurementId: "G-ZT7LN4XP80"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

async function updateFinanceAdminUsers() {
  try {
    // Sign in first
    console.log('Signing in...');
    await signInWithEmailAndPassword(auth, "mso@1pwrafrica.com", "1PWR00");
    console.log('Signed in successfully');

    // Query all users
    console.log('Fetching users...');
    const usersRef = collection(db, 'users');
    const querySnapshot = await getDocs(usersRef);
    
    // Keep track of updates
    const updates = [];
    
    console.log('Current users with Finance Admin role:');
    querySnapshot.forEach((userDoc) => {
      const userData = userDoc.data();
      if (userData.permissionLevel === 4) {
        console.log(`- ${userData.email}`);
        updates.push({
          id: userDoc.id,
          email: userData.email,
          oldLevel: userData.permissionLevel
        });
      }
    });

    if (updates.length === 0) {
      console.log('No Finance Admin users found');
      process.exit(0);
    }

    console.log(`\nUpdating ${updates.length} users to Requestor level...`);
    
    // Update each user
    for (const user of updates) {
      await updateDoc(doc(db, 'users', user.id), {
        permissionLevel: 5
      });
      console.log(`Updated ${user.email} from level ${user.oldLevel} to level 5`);
    }

    console.log('\nAll updates completed successfully');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

updateFinanceAdminUsers();
