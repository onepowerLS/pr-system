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
  rule: Rule,
  user: User,
  targetStatus: PRStatus = PRStatus.PENDING_APPROVAL
): Promise<ValidationResult> {
  const errors: string[] = [];
  
  // 1. Validate organization matches
  if (pr.organization !== rule.organization.name) {
    errors.push('Organization mismatch between PR and approval rule');
    return { isValid: false, errors };
  }

  // 2. Convert PR amount to rule's currency for comparison
  const convertedAmount = await convertAmount(
    pr.estimatedAmount,
    pr.currency,
    rule.currency
  );
  
  // 3. Check permissions based on current status and target status
  if (pr.status === PRStatus.IN_QUEUE && targetStatus === PRStatus.PENDING_APPROVAL) {
    // Moving from IN_QUEUE to PENDING_APPROVAL requires procurement permission
    if (!user.permissions?.canProcessPR) {
      errors.push('User does not have procurement permissions');
      return { isValid: false, errors };
    }
  } else if (targetStatus === PRStatus.APPROVED) {
    // Moving to APPROVED requires approval permission
    if (!user.permissions?.canApprovePR) {
      errors.push('User does not have approval permissions');
      return { isValid: false, errors };
    }
  }

  // 4. Check quote requirements
  if (!pr.quotes || !Array.isArray(pr.quotes)) {
    pr.quotes = []; // Initialize empty array if undefined
  }

  const isAboveThreshold = convertedAmount > rule.threshold;
  const isLowValue = convertedAmount <= 1000; // Low value threshold for admin approval

  // Determine required quotes based on PR value and vendor status
  const requiredQuotes = isLowValue 
    ? 1 // Only 1 quote required for low-value PRs (≤ 1,000 LSL)
    : isAboveThreshold 
      ? rule.quoteRequirements.aboveThreshold // 3 quotes for high-value PRs (> 50,000 LSL)
      : pr.preferredVendor && await isVendorApproved(pr.preferredVendor)
        ? rule.quoteRequirements.belowThreshold.approved // 1 quote for approved vendors
        : rule.quoteRequirements.belowThreshold.default; // Standard requirement
  
  if (pr.quotes.length < requiredQuotes) {
    errors.push(
      `Requires ${requiredQuotes} quote${requiredQuotes > 1 ? 's' : ''}. Currently has ${pr.quotes.length}. ${
        isLowValue 
          ? 'Low-value PR requires only one quote.'
          : isAboveThreshold 
            ? 'High-value PR requires more quotes.' 
            : pr.preferredVendor && await isVendorApproved(pr.preferredVendor)
              ? 'Approved vendor requires fewer quotes.'
              : 'Standard quote requirement applies.'
      }`
    );
  }

  // 5. Verify vendor status if preferred vendor is specified
  // Skip vendor approval check for low-value PRs
  if (pr.preferredVendor && !isLowValue) {
    const isApproved = await isVendorApproved(pr.preferredVendor);
    if (!isApproved) {
      errors.push('Preferred vendor is not approved');
    }
  }

  // 6. Check adjudication requirements
  // Only require adjudication notes when moving from PENDING_APPROVAL to APPROVED
  if (targetStatus === PRStatus.APPROVED && isAboveThreshold) {
    if (!pr.adjudication?.notes) {
      errors.push('Adjudication notes are required for high-value PRs');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}
