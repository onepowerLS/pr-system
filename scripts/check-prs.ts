import { initializeApp } from 'firebase/app';
import { getFirestore, collection, query, where, getDocs } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyD0tA1fvWs5dCr-7JqJv_bxlay2Bhs72jQ',
  authDomain: 'pr-system-4ea55.firebaseapp.com',
  projectId: 'pr-system-4ea55',
  storageBucket: 'pr-system-4ea55.firebasestorage.app',
  messagingSenderId: '562987209098',
  appId: '1:562987209098:web:2f788d189f1c0867cb3873',
  measurementId: 'G-ZT7LN4XP80'
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function checkPRs() {
  try {
    const q = query(
      collection(db, 'purchaseRequests'),
      where('organization', '==', '1PWR LESOTHO')
    );
    
    const querySnapshot = await getDocs(q);
    console.log('Found PRs:', querySnapshot.size);
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      console.log('PR:', {
        id: doc.id,
        prNumber: data.prNumber,
        organization: data.organization,
        status: data.status,
        createdBy: data.createdBy,
        createdAt: data.createdAt?.toDate?.()
      });
    });
  } catch (error) {
    console.error('Error:', error);
  }
}

checkPRs();
