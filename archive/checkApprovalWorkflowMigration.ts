/**
 * Approval Workflow Migration Checker
 * 
 * This script identifies PRs that have discrepancies between their legacy approver fields
 * and the new approvalWorkflow structure, and optionally migrates them to use the new structure.
 * 
 * Usage:
 * - Run in dry mode (only check, don't update): ts-node src/scripts/checkApprovalWorkflowMigration.ts
 * - Run in migration mode: ts-node src/scripts/checkApprovalWorkflowMigration.ts --migrate
 */

import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  getDocs,
  updateDoc,
  Timestamp
} from 'firebase/firestore';
import config from '../config/firebase';
import { PRRequest } from '../types/pr';

// Initialize Firebase
const app = initializeApp(config);
const db = getFirestore(app);
const PR_COLLECTION = 'prs';

// Command line arguments
const shouldMigrate = process.argv.includes('--migrate');

/**
 * Main function to check and optionally migrate approval workflow
 */
async function checkAndMigrateApprovalWorkflow() {
  console.log('Checking for PRs with approval workflow discrepancies...');
  console.log(`Mode: ${shouldMigrate ? 'MIGRATION' : 'DRY RUN'}`);
  
  try {
    // Get all PRs
    const prsRef = collection(db, PR_COLLECTION);
    const prsSnapshot = await getDocs(prsRef);
    
    console.log(`Found ${prsSnapshot.size} PRs in total.`);
    
    // Stats counters
    let discrepancyCount = 0;
    let missingWorkflowCount = 0;
    let updatedCount = 0;
    
    // Process PRs
    for (const prDoc of prsSnapshot.docs) {
      const pr = prDoc.data() as PRRequest;
      const prId = prDoc.id;
      
      // Case 1: PR has both legacy approver and approvalWorkflow with discrepancy
      if (pr.approver && pr.approvalWorkflow?.currentApprover && 
          pr.approver !== pr.approvalWorkflow.currentApprover) {
        discrepancyCount++;
        console.log(`\nDiscrepancy in PR: ${pr.prNumber} (ID: ${prId})`);
        console.log(`- Legacy approver: ${pr.approver}`);
        console.log(`- Workflow approver: ${pr.approvalWorkflow.currentApprover}`);
        console.log(`- PR Status: ${pr.status}`);
        
        if (shouldMigrate) {
          // Update the approvalWorkflow to match the legacy approver
          // We prioritize the legacy approver field in this migration
          const updatedWorkflow = {
            ...pr.approvalWorkflow,
            currentApprover: pr.approver,
            lastUpdated: Timestamp.fromDate(new Date())
          };
          
          await updateDoc(doc(db, PR_COLLECTION, prId), {
            approvalWorkflow: updatedWorkflow
          });
          
          console.log(`- UPDATED: Set workflow approver to ${pr.approver}`);
          updatedCount++;
        }
      }
      
      // Case 2: PR has legacy approver but missing or incomplete approvalWorkflow
      else if (pr.approver && (!pr.approvalWorkflow || !pr.approvalWorkflow.currentApprover)) {
        missingWorkflowCount++;
        console.log(`\nMissing workflow in PR: ${pr.prNumber} (ID: ${prId})`);
        console.log(`- Legacy approver: ${pr.approver}`);
        console.log(`- PR Status: ${pr.status}`);
        
        if (shouldMigrate) {
          // Create a new approvalWorkflow using the legacy approver
          const newWorkflow = {
            currentApprover: pr.approver,
            approvalHistory: [],
            lastUpdated: Timestamp.fromDate(new Date())
          };
          
          await updateDoc(doc(db, PR_COLLECTION, prId), {
            approvalWorkflow: newWorkflow
          });
          
          console.log(`- CREATED: New workflow with approver ${pr.approver}`);
          updatedCount++;
        }
      }
    }
    
    // Print summary
    console.log('\nSummary:');
    console.log(`- Total PRs: ${prsSnapshot.size}`);
    console.log(`- PRs with approver discrepancies: ${discrepancyCount}`);
    console.log(`- PRs with missing workflow: ${missingWorkflowCount}`);
    
    if (shouldMigrate) {
      console.log(`- PRs updated: ${updatedCount}`);
      console.log('\nMigration complete.');
    } else {
      console.log('\nThis was a dry run. No changes were made.');
      console.log('To apply migrations, run with the --migrate flag.');
    }
    
  } catch (error) {
    console.error('Error in migration process:', error);
  }
}

// Run the script
checkAndMigrateApprovalWorkflow();
