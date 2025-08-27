/**
 * Script to delete all PRs with DRAFT status
 * 
 * This script connects to Firestore and deletes all PRs with status 'DRAFT'
 * as they are no longer needed according to the protocol and specification.
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, query, where, getDocs, writeBatch } = require('firebase/firestore');
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');

// Firebase configuration with direct values
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

const PR_COLLECTION = 'purchaseRequests';

async function deleteDraftPRs() {
  console.log('Starting deletion of DRAFT PRs...');
  
  try {
    // First authenticate with provided credentials
    console.log('Authenticating...');
    await signInWithEmailAndPassword(auth, "mso@1pwrafrica.com", "1PWR00");
    console.log('Authentication successful');
    
    // Query all PRs with status 'DRAFT'
    console.log('Querying DRAFT PRs...');
    const q = query(collection(db, PR_COLLECTION), where('status', '==', 'DRAFT'));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      console.log('No DRAFT PRs found.');
      return;
    }
    
    const prCount = snapshot.docs.length;
    console.log(`Found ${prCount} DRAFT PRs to delete.`);
    
    // Create a batch for efficient deletion
    const batchSize = 500; // Firestore batch limit is 500
    let batch = writeBatch(db);
    let count = 0;
    let totalDeleted = 0;
    
    // Add each document to the batch
    for (const doc of snapshot.docs) {
      batch.delete(doc.ref);
      count++;
      
      // When we reach the batch limit, commit and create a new batch
      if (count >= batchSize) {
        console.log(`Committing batch of ${count} deletions...`);
        await batch.commit();
        totalDeleted += count;
        count = 0;
        batch = writeBatch(db);
      }
    }
    
    // Commit any remaining deletes
    if (count > 0) {
      console.log(`Committing final batch of ${count} deletions...`);
      await batch.commit();
      totalDeleted += count;
    }
    
    console.log(`Successfully deleted ${totalDeleted} DRAFT PRs.`);
  } catch (error) {
    console.error('Error deleting DRAFT PRs:', error);
    if (error.code) {
      console.error('Error code:', error.code);
    }
    if (error.message) {
      console.error('Error message:', error.message);
    }
  }
}

// Run the script
deleteDraftPRs().catch(console.error);
