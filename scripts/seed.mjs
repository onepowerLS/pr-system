import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import seedReferenceData from '../src/scripts/seedReferenceData.ts';

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

async function runSeed() {
  try {
    await seedReferenceData();
    console.log('Seed completed successfully');
  } catch (error) {
    console.error('Error running seed:', error);
  }
}

runSeed();
