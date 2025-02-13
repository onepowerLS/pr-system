import { User } from '../types/user';
import { PRRequest } from '../types/pr';
import { Rule } from '../types/referenceData';
import { convertAmount } from './currencyConverter';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { PRStatus } from '../types/pr';

const VENDORS_COLLECTION = 'vendors';

interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

enum PERMISSION_LEVELS {
  APPROVER,
  APPROVER_2
}

async function isVendorApproved(vendorId: string): Promise<boolean> {
  const db = getFirestore();
  const vendorRef = doc(db, VENDORS_COLLECTION, vendorId);
  const vendorDoc = await getDoc(vendorRef);
  
  if (!vendorDoc.exists()) {
    return false;
  }
  
  return vendorDoc.data().isApproved === true;
}

export async function validatePRForApproval(
  pr: PRRequest,
  rules: Rule[],
  user: User,
  targetStatus: PRStatus = PRStatus.PENDING_APPROVAL
): Promise<ValidationResult> {
  const errors: string[] = [];
  
  // 1. Validate organization matches
  if (!rules.some(rule => rule.organization.name === pr.organization)) {
    errors.push('Organization mismatch between PR and approval rules');
    return { isValid: false, errors };
  }

  // 2. Validate quotes
  if (!pr.quotes || !Array.isArray(pr.quotes)) {
    errors.push('No quotes found');
    return { isValid: false, errors };
  }

  // Validate each quote has required fields and attachments
  const validQuotes = pr.quotes.filter(quote => {
    if (!quote.amount || !quote.currency || !quote.vendorId) {
      return false;
    }
    // Check for attachments unless it's below threshold with approved vendor
    if (!quote.attachments || quote.attachments.length === 0) {
      return false;
    }
    return true;
  });

  if (validQuotes.length === 0) {
    errors.push('No valid quotes found. Each quote must have an amount, currency, vendor, and attachment');
    return { isValid: false, errors };
  }

  // 3. Convert all quote amounts to rule currency for comparison
  const rule1 = rules.find(r => r.type === 'RULE_1');
  if (!rule1) {
    errors.push('Required Rule 1 not found');
    return { isValid: false, errors };
  }

  const convertedQuoteAmounts = await Promise.all(
    validQuotes.map(async quote => ({
      ...quote,
      convertedAmount: await convertAmount(quote.amount, quote.currency, rule1.currency)
    }))
  );

  // 4. Get lowest quote amount for threshold comparison
  const lowestQuoteAmount = Math.min(...convertedQuoteAmounts.map(q => q.convertedAmount));

  // 5. Determine which rule applies based on lowest quote amount
  const rule2 = rules.find(r => r.type === 'RULE_2');
  if (!rule2) {
    errors.push('Required Rule 2 not found');
    return { isValid: false, errors };
  }

  const isAboveRule2Threshold = lowestQuoteAmount > rule2.threshold;
  const isAboveRule1Threshold = lowestQuoteAmount > rule1.threshold;
  
  // 6. Apply quote requirements based on thresholds
  if (isAboveRule2Threshold) {
    // Above Rule 2: Always need 3 quotes with attachments
    if (validQuotes.length < 3) {
      errors.push(`Three quotes with attachments are required for amounts above ${rule2.threshold} ${rule2.currency}`);
    }
    if (user.permissionLevel !== PERMISSION_LEVELS.APPROVER) {
      errors.push('Only Level 2 approvers can approve PRs above the higher threshold');
    }
  } else if (isAboveRule1Threshold) {
    // Between Rule 1 and 2: Need 3 quotes unless preferred vendor
    const isPreferredVendor = pr.preferredVendor && await isVendorApproved(pr.preferredVendor);
    if (!isPreferredVendor && validQuotes.length < 3) {
      errors.push(`Three quotes with attachments are required for amounts above ${rule1.threshold} ${rule1.currency} unless using an approved vendor`);
    }
    if (user.permissionLevel !== PERMISSION_LEVELS.APPROVER) {
      errors.push('Only Level 2 approvers can approve PRs above the lower threshold');
    }
  } else {
    // Below Rule 1: Need 1 quote, Level 2 or 6 can approve
    if (validQuotes.length < 1) {
      errors.push('At least one quote is required');
    }
    // If using preferred vendor below threshold, no attachment needed
    const isPreferredVendor = pr.preferredVendor && await isVendorApproved(pr.preferredVendor);
    if (!isPreferredVendor && !validQuotes.some(q => q.attachments?.length > 0)) {
      errors.push('Quote must have an attachment unless using an approved vendor below threshold');
    }
    if (user.permissionLevel !== PERMISSION_LEVELS.APPROVER && 
        user.permissionLevel !== PERMISSION_LEVELS.APPROVER_2) {
      errors.push('Only Level 2 or Level 6 approvers can approve PRs');
    }
  }

  // 7. Verify vendor status if preferred vendor is specified
  // Skip vendor approval check for low-value PRs
  if (pr.preferredVendor) {
    const isLowValue = lowestQuoteAmount <= 1000; 
    if (!isLowValue) {
      const isApproved = await isVendorApproved(pr.preferredVendor);
      if (!isApproved) {
        errors.push('Preferred vendor is not approved');
      }
    }
  }

  // 8. Check adjudication requirements
  // Only require adjudication notes when moving from PENDING_APPROVAL to APPROVED
  if (targetStatus === PRStatus.APPROVED && lowestQuoteAmount > rule2.threshold) {
    if (!pr.adjudication?.notes) {
      errors.push('Adjudication notes are required for high-value PRs');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}
