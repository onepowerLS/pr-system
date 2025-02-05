import { getFirestore, collection, addDoc } from 'firebase/firestore';
import { Rule } from '../src/types/referenceData';

const DEFAULT_RULES: Partial<Rule>[] = [
  {
    organizationId: '1PWR LESOTHO',
    currency: 'LSL',
    threshold: 50000, // Amount above which more quotes are required
    approverThresholds: {
      procurement: 100000,    // Procurement can approve up to 100k
      financeAdmin: 500000,   // Finance admin can approve up to 500k
      ceo: null               // CEO can approve any amount
    },
    quoteRequirements: {
      aboveThreshold: 3,      // 3 quotes required above threshold
      belowThreshold: {
        approved: 1,          // 1 quote required if approved vendor
        default: 2           // 2 quotes required if not approved vendor
      }
    },
    active: true,
    createdAt: new Date().toISOString()
  }
];

async function setupOrgRules() {
  const db = getFirestore();
  const rulesCollection = collection(db, 'rules');

  try {
    for (const rule of DEFAULT_RULES) {
      await addDoc(rulesCollection, rule);
      console.log(`Created rule for organization: ${rule.organizationId}`);
    }
    console.log('Successfully set up organization rules');
  } catch (error) {
    console.error('Error setting up organization rules:', error);
    throw error;
  }
}

setupOrgRules().catch(console.error);
