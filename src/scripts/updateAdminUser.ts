import { db } from '../config/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

const updateAdminUser = async () => {
  try {
    // Get user document by email
    const userDoc = await getDoc(doc(db, 'users', 'mso@1pwrafrica.com'));
    
    if (userDoc.exists()) {
      // Update user with admin role and highest permission level
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
