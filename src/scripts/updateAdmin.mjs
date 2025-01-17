import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, updateDoc } from 'firebase/firestore';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDiWxMiRPLtlBJgdvVZLgUHWJxBqgJWlRU",
  authDomain: "pr-system-1pwrafrica.firebaseapp.com",
  projectId: "pr-system-1pwrafrica",
  storageBucket: "pr-system-1pwrafrica.appspot.com",
  messagingSenderId: "1095245800465",
  appId: "1:1095245800465:web:d4f0f6d8a9a3d4e0d9d9d9"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const updateAdminUser = async () => {
  try {
    const userDoc = await getDoc(doc(db, 'users', 'mso@1pwrafrica.com'));
    
    if (userDoc.exists()) {
      await updateDoc(doc(db, 'users', userDoc.id), {
        role: 'ADMIN',
        permissionLevel: 1,
        isActive: true
      });
      console.log('Successfully updated admin user');
    } else {
      console.error('User document not found');
    }
  } catch (error) {
    console.error('Error updating admin user:', error);
  }
};

updateAdminUser();
