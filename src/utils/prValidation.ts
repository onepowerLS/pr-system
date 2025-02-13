import { User, UserRole } from '../types/user';
import { PRRequest } from '../types/pr';
import { Rule } from '../types/referenceData';
import { convertAmount } from './currencyConverter';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { PRStatus } from '../types/pr';
import { approverService } from '../services/approver';

const VENDORS_COLLECTION = 'referenceData_vendors';

interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

enum PERMISSION_LEVELS {
  APPROVER,
  APPROVER_2,
  SYSTEM_ADMIN
}

async function isVendorApproved(vendorId: string): Promise<boolean> {
  const db = getFirestore();
  // Normalize vendor ID to lowercase
  const normalizedVendorId = vendorId.toLowerCase();
  console.log('Checking vendor approval:', { original: vendorId, normalized: normalizedVendorId });
  
  const vendorRef = doc(db, VENDORS_COLLECTION, normalizedVendorId);
  const vendorDoc = await getDoc(vendorRef);
  
  if (!vendorDoc.exists()) {
    console.warn(`Vendor not found: ${vendorId} (normalized: ${normalizedVendorId})`);
    return false;
  }
  
  const data = vendorDoc.data();
  const isApproved = data.isApproved === true || data.approved === true;
  console.log(`Vendor ${vendorId} data:`, data);
  console.log(`Vendor ${vendorId} approval status:`, isApproved);
  return isApproved;
}

export async function validatePRForApproval(
  pr: PRRequest,
  rules: Rule[],
  user: User,
  targetStatus: PRStatus = PRStatus.PENDING_APPROVAL
): Promise<ValidationResult> {
  console.log('Validating PR with user:', {
    userRole: user.role,
    permissionLevel: user.permissionLevel,
    email: user.email
  });
  
  const errors: string[] = [];
  
  // Helper function to check if user can push to approver
  const canPushToApprover = (user: User): boolean => {
    console.log('Checking if user can push to approver:', {
      role: user.role,
      permissionLevel: user.permissionLevel,
      email: user.email
    });
    
    // Only Level 1 (admin) or Level 3 (procurement) can push to approver
    return user.permissionLevel === 1 || user.permissionLevel === 3;
  };

  console.log('Validating PR:', {
    preferredVendor: pr.preferredVendor,
    quotes: pr.quotes?.length,
    canPushToApprover: canPushToApprover(user)
  });

  // 1. Check if user can push to approver
  if (!canPushToApprover(user)) {
    errors.push('Only system administrators and procurement users can push PRs to approver');
  }

  // 2. Get rules first since we need them for validation
  const rule1 = rules.find(r => r.type === 'RULE_1');
  const rule2 = rules.find(r => r.type === 'RULE_2');

  if (!rule1 || !rule2) {
    errors.push('Required approval rules not found');
    return { isValid: false, errors };
  }

  // 3. Validate quotes exist
  if (!pr.quotes || pr.quotes.length === 0) {
    errors.push('At least one quote is required');
    return { isValid: false, errors };
  }

  // 4. Validate quote attachments
  const validQuotes = pr.quotes.filter(quote => 
    quote.attachments && quote.attachments.length > 0
  );

  console.log('Quote validation:', {
    totalQuotes: pr.quotes.length,
    validQuotes: validQuotes.length,
    quotesWithAttachments: validQuotes.map(q => ({
      id: q.id,
      hasAttachments: q.attachments?.length > 0
    }))
  });

  // 5. Convert all quote amounts to rule currency for comparison
  console.log('Converting quote amounts:', {
    quotes: pr.quotes,
    targetCurrency: rule1.currency
  });

  const convertedQuoteAmounts = await Promise.all(
    pr.quotes.map(async quote => ({
      quote,
      convertedAmount: await convertAmount(
        quote.amount,
        quote.currency,
        rule1.currency
      )
    }))
  );

  // 6. Get lowest quote amount for threshold comparison
  const lowestQuoteAmount = Math.min(...convertedQuoteAmounts.map(q => q.convertedAmount));

  console.log('Threshold check:', {
    lowestQuoteAmount,
    rule1Threshold: rule1.threshold,
    rule2Threshold: rule2.threshold,
    estimatedAmount: pr.estimatedAmount,
    isAboveRule1: lowestQuoteAmount >= rule1.threshold,
    isAboveRule2: lowestQuoteAmount >= rule2.threshold
  });

  const isAboveRule2Threshold = lowestQuoteAmount >= rule2.threshold;
  const isAboveRule1Threshold = lowestQuoteAmount >= rule1.threshold;

  // 7. Apply quote requirements based on thresholds
  if (isAboveRule2Threshold) {
    // Above Rule 2: Always need 3 quotes with attachments
    if (validQuotes.length < 3) {
      errors.push(`Three quotes with attachments are required for amounts above ${rule2.threshold} ${rule2.currency}`);
    }
  } else if (isAboveRule1Threshold) {
    // Between Rule 1 and 2: Need 3 quotes unless preferred vendor
    const isPreferredVendor = pr.preferredVendor && await isVendorApproved(pr.preferredVendor.toLowerCase());
    console.log('Rule 1 validation:', {
      isPreferredVendor,
      quotesRequired: isPreferredVendor ? 1 : 3,
      quotesProvided: validQuotes.length
    });
    
    if (!isPreferredVendor && validQuotes.length < 3) {
      errors.push(`Three quotes with attachments are required for amounts above ${rule1.threshold} ${rule1.currency} unless using an approved vendor`);
    } else if (isPreferredVendor && validQuotes.length < 1) {
      errors.push(`At least one quote with attachment is required when using an approved vendor`);
    }
  } else {
    // Below Rule 1: Need 1 quote
    if (validQuotes.length < 1) {
      errors.push('At least one quote is required');
    }
  }

  // 8. Check if there are approvers with sufficient permission
  const approvers = await approverService.getApprovers(pr.organization);
  console.log('Available approvers:', approvers);

  const hasValidApprover = approvers.some(approver => {
    // Level 1 and 2 can approve any amount
    if (approver.permissionLevel === 1 || approver.permissionLevel === 2) {
      return true;
    }
    
    // Level 6 can only approve below Rule 1 threshold
    if (approver.permissionLevel === 6) {
      return lowestQuoteAmount < rule1.threshold;
    }
    
    return false;
  });

  if (!hasValidApprover) {
    if (isAboveRule2Threshold) {
      errors.push(`Only Level 1 or 2 approvers can approve PRs above ${rule2.threshold} ${rule2.currency}`);
    } else if (isAboveRule1Threshold) {
      errors.push(`Only Level 1 or 2 approvers can approve PRs above ${rule1.threshold} ${rule1.currency}`);
    } else {
      errors.push('No approvers found with sufficient permission');
    }
  }

  console.log('Validation complete:', {
    errors,
    isValid: errors.length === 0,
    validQuotes: validQuotes.length,
    requiredQuotes: isAboveRule2Threshold ? 3 : (isAboveRule1Threshold ? 3 : 1),
    hasValidApprover
  });

  // 9. Verify vendor status if preferred vendor is specified
  if (pr.preferredVendor) {
    const isLowValue = lowestQuoteAmount < 1000;  
    if (!isLowValue) {
      const isApproved = await isVendorApproved(pr.preferredVendor.toLowerCase());
      if (!isApproved) {
        errors.push('Validation Error:\nPreferred vendor is not approved for amounts of 1000 LSL or more');
      }
    }
  }

  // 10. Check adjudication requirements
  if (targetStatus === PRStatus.APPROVED && lowestQuoteAmount > rule2.threshold) {
    if (!pr.adjudication?.notes) {
      errors.push('Validation Error:\nAdjudication notes are required for high-value PRs');
    }
  }
  
  // Return validation result
  return {
    isValid: errors.length === 0,
    errors
  };
}
