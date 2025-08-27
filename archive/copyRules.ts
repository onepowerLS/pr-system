/**
 * Script to copy rules from one organization to others
 * 
 * This script copies all rules from a source organization to one or more
 * target organizations, preserving all rule properties but updating the
 * organization references.
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Load environment variables
dotenv.config();

// Initialize Firebase Admin
const serviceAccountPath = path.resolve(process.cwd(), 'firebase-service-account.json');

if (!fs.existsSync(serviceAccountPath)) {
  console.error('Firebase service account file not found at:', serviceAccountPath);
  process.exit(1);
}

// Use dynamic import for JSON files in ES modules
const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

// Configuration
const SOURCE_ORG = '1pwr_lesotho'; // Source organization ID (normalized)
const TARGET_ORGS = [
  { id: 'smp', name: 'SMP' },
  { id: 'pueco_lesotho', name: 'PUECO LESOTHO' }
];
const RULES_COLLECTION = 'referenceData_rules';

/**
 * Normalizes an organization ID (lowercase with underscores)
 */
function normalizeOrgId(orgId: string): string {
  return orgId.toLowerCase().replace(/\s+/g, '_');
}

/**
 * Copies rules from source organization to target organizations
 */
async function copyRules() {
  try {
    console.log(`Copying rules from ${SOURCE_ORG} to ${TARGET_ORGS.map(org => org.name).join(', ')}...`);
    
    // Get all rules for the source organization
    const rulesRef = db.collection(RULES_COLLECTION);
    const sourceRulesQuery = await rulesRef.where('organizationId', '==', SOURCE_ORG).get();
    
    if (sourceRulesQuery.empty) {
      console.error(`No rules found for source organization: ${SOURCE_ORG}`);
      process.exit(1);
    }
    
    console.log(`Found ${sourceRulesQuery.size} rules for ${SOURCE_ORG}`);
    
    // Process each target organization
    for (const targetOrg of TARGET_ORGS) {
      const normalizedTargetOrgId = normalizeOrgId(targetOrg.id);
      
      console.log(`\nProcessing target organization: ${targetOrg.name} (${normalizedTargetOrgId})`);
      
      // Check if target org already has rules
      const existingRulesQuery = await rulesRef
        .where('organizationId', '==', normalizedTargetOrgId)
        .get();
      
      if (!existingRulesQuery.empty) {
        console.log(`Target organization ${targetOrg.name} already has ${existingRulesQuery.size} rules.`);
        const overwrite = process.env.OVERWRITE_EXISTING_RULES === 'true';
        
        if (!overwrite) {
          console.log(`Skipping ${targetOrg.name} (set OVERWRITE_EXISTING_RULES=true to overwrite)`);
          continue;
        } else {
          console.log(`Overwriting existing rules for ${targetOrg.name}...`);
          
          // Delete existing rules
          const batch = db.batch();
          existingRulesQuery.forEach(doc => {
            batch.delete(doc.ref);
          });
          await batch.commit();
          console.log(`Deleted ${existingRulesQuery.size} existing rules for ${targetOrg.name}`);
        }
      }
      
      // Copy rules to target organization
      const batch = db.batch();
      let copiedCount = 0;
      
      sourceRulesQuery.forEach(doc => {
        const sourceData = doc.data();
        const newRuleRef = rulesRef.doc(); // Generate a new document ID
        
        // Create a new rule with updated organization references
        const newRuleData = {
          ...sourceData,
          organizationId: normalizedTargetOrgId,
          organization: {
            id: normalizedTargetOrgId,
            name: targetOrg.name
          },
          updatedAt: new Date().toISOString()
        };
        
        batch.set(newRuleRef, newRuleData);
        copiedCount++;
      });
      
      await batch.commit();
      console.log(`Successfully copied ${copiedCount} rules to ${targetOrg.name}`);
    }
    
    console.log('\nRule copying completed successfully!');
    
  } catch (error) {
    console.error('Error copying rules:', error);
    process.exit(1);
  }
}

// Execute the function
copyRules().then(() => {
  console.log('Script execution completed.');
  process.exit(0);
}).catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
