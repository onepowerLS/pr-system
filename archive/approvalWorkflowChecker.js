/**
 * PR Approval Workflow Checker
 * 
 * This file contains a function to check if PRs are correctly using
 * the approvalWorkflow structure as the single source of truth.
 * 
 * To use this:
 * 1. Open browser console in the PR system application
 * 2. Copy and paste the contents of this file into the console
 * 3. Run the checkApprovalWorkflow() function
 */

// Add this to any PR view page to check approval workflow structure
function checkApprovalWorkflow(pr) {
  console.group('PR Approval Info Check');
  console.log('PR Number:', pr.prNumber);
  console.log('Status:', pr.status);
  
  // Check if using proper approval workflow
  if (pr.approvalWorkflow) {
    console.log('✅ Using approvalWorkflow:', pr.approvalWorkflow);
  } else {
    console.warn('❌ Missing approvalWorkflow structure');
  }
  
  // Check for deprecated fields
  if (pr.approver !== undefined) {
    console.warn('⚠️ Using deprecated pr.approver:', pr.approver);
    
    // Check for inconsistency
    if (pr.approvalWorkflow?.currentApprover !== pr.approver) {
      console.error('❌ Inconsistent data: pr.approver ≠ approvalWorkflow.currentApprover');
    }
  }
  
  if (Array.isArray(pr.approvers) && pr.approvers.length > 0) {
    console.warn('⚠️ Using deprecated pr.approvers:', pr.approvers);
    
    // Check for inconsistency with first approver
    if (pr.approvalWorkflow?.currentApprover !== pr.approvers[0]) {
      console.error('❌ Inconsistent data: pr.approvers[0] ≠ approvalWorkflow.currentApprover');
    }
  }
  
  console.groupEnd();
  
  return {
    hasApprovalWorkflow: !!pr.approvalWorkflow,
    hasDeprecatedFields: pr.approver !== undefined || (Array.isArray(pr.approvers) && pr.approvers.length > 0),
    isConsistent: (pr.approver === undefined || pr.approver === pr.approvalWorkflow?.currentApprover) && 
                 (!Array.isArray(pr.approvers) || pr.approvers.length === 0 || pr.approvers[0] === pr.approvalWorkflow?.currentApprover)
  };
}

// Run this in the console on the PR list page
function checkAllPRsInView() {
  // Get PRs from the global state or DOM elements
  // This depends on how the app is structured, but here's a general approach
  const prElements = document.querySelectorAll('[data-pr-id]');
  
  if (prElements.length === 0) {
    console.log('No PR elements found. Make sure you are on the PR list page.');
    return;
  }
  
  console.log(`Found ${prElements.length} PRs in the current view`);
  
  // Check PRs that are in the global state or retrieve them
  // This is just a placeholder - you'll need to adapt this to how PRs are stored in your app
  if (window.prListData && Array.isArray(window.prListData)) {
    const results = window.prListData.map(checkApprovalWorkflow);
    
    // Summarize results
    const summary = results.reduce((acc, result) => {
      if (result.hasApprovalWorkflow) acc.withApprovalWorkflow++;
      if (result.hasDeprecatedFields) acc.withDeprecatedFields++;
      if (!result.isConsistent) acc.inconsistentData++;
      return acc;
    }, { 
      total: results.length, 
      withApprovalWorkflow: 0, 
      withDeprecatedFields: 0, 
      inconsistentData: 0 
    });
    
    console.group('Migration Status Summary');
    console.log(`Total PRs: ${summary.total}`);
    console.log(`PRs with approvalWorkflow: ${summary.withApprovalWorkflow} (${Math.round(summary.withApprovalWorkflow/summary.total*100)}%)`);
    console.log(`PRs with deprecated fields: ${summary.withDeprecatedFields} (${Math.round(summary.withDeprecatedFields/summary.total*100)}%)`);
    console.log(`PRs with inconsistent data: ${summary.inconsistentData} (${Math.round(summary.inconsistentData/summary.total*100)}%)`);
    console.groupEnd();
  } else {
    console.log('PR data not available in the expected format. Try running checkApprovalWorkflow() on individual PRs.');
  }
}

console.log('PR Approval Workflow Checker loaded. Run checkAllPRsInView() to check all PRs in the current view or checkApprovalWorkflow(pr) to check a specific PR.');

/**
 * Approval Workflow Checker Utility
 * 
 * This script checks for discrepancies between the legacy approver field
 * and the approvalWorkflow.currentApprover field in PR documents.
 * 
 * Usage: 
 * - Run this script from the command line: node src/utils/approvalWorkflowChecker.js
 */

// Import Firebase dependencies
const { initializeApp } = require('firebase/app');
const { 
  getFirestore, 
  collection, 
  getDocs,
  query, 
  where,
  Timestamp 
} = require('firebase/firestore');

// Initialize Firebase
const firebaseConfig = {
  // Your Firebase config should be loaded from environment variables in production
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

/**
 * Check for PRs with approver discrepancies
 */
async function checkApproverDiscrepancies() {
  console.log('Checking for approver field discrepancies...');
  
  try {
    // Get all PRs
    const prsRef = collection(db, 'prs');
    const prsSnapshot = await getDocs(prsRef);
    
    console.log(`Found ${prsSnapshot.size} PRs in total.`);
    
    // Counter for problematic PRs
    let discrepancyCount = 0;
    let missingWorkflowCount = 0;
    
    // Iterate through PRs
    prsSnapshot.docs.forEach(prDoc => {
      const pr = prDoc.data();
      
      // Check if PR has both legacy approver field and approvalWorkflow
      if (pr.approver && pr.approvalWorkflow && pr.approvalWorkflow.currentApprover) {
        // Check for discrepancy
        if (pr.approver !== pr.approvalWorkflow.currentApprover) {
          discrepancyCount++;
          console.log(`\nDiscrepancy found in PR: ${pr.prNumber} (ID: ${prDoc.id})`);
          console.log(`- Legacy approver: ${pr.approver}`);
          console.log(`- Workflow approver: ${pr.approvalWorkflow.currentApprover}`);
          console.log(`- PR Status: ${pr.status}`);
        }
      } 
      // Check if PR has approver but no workflow
      else if (pr.approver && (!pr.approvalWorkflow || !pr.approvalWorkflow.currentApprover)) {
        missingWorkflowCount++;
        console.log(`\nMissing workflow for PR: ${pr.prNumber} (ID: ${prDoc.id})`);
        console.log(`- Legacy approver: ${pr.approver}`);
        console.log(`- PR Status: ${pr.status}`);
      }
    });
    
    // Print summary
    console.log('\nSummary:');
    console.log(`- Total PRs: ${prsSnapshot.size}`);
    console.log(`- PRs with approver discrepancies: ${discrepancyCount}`);
    console.log(`- PRs with missing workflow but having approver: ${missingWorkflowCount}`);
    
  } catch (error) {
    console.error('Error checking approver discrepancies:', error);
  }
}

// Run the check
checkApproverDiscrepancies();
