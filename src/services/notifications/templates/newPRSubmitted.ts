import { EmailContent, NotificationContext } from '../types';
import { generateEmailHeaders } from '../types/emailHeaders';
import { styles } from './styles';
import { UserReference } from '../../../types/pr';
import { referenceDataService } from '@/services/referenceData';
import { logger } from '@/utils/logger';
import { db } from '@/config/firebase';
import { doc, getDoc } from 'firebase/firestore';

// Helper function to format currency
function formatCurrency(amount?: number): string {
  if (amount === undefined || amount === null) return 'Not specified';
  
  // Format with LSL currency code and 2 decimal places
  return `LSL ${amount.toFixed(2)}`;
}

// Helper function to format date
function formatDate(dateString?: string): string {
  if (!dateString) return 'Not specified';
  
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  } catch (e) {
    return dateString;
  }
}

// Helper function to resolve reference data IDs to names
async function resolveReferenceData(id: string, type: string, organization?: string): Promise<string> {
  if (!id) return 'Not specified';
  
  try {
    // If it doesn't look like an ID (no special characters, just plain text), return as is
    if (!/[^a-zA-Z0-9_]/.test(id) && id.length < 20) {
      return id;
    }
    
    // Try to get the reference data item
    let items: any[] = [];
    
    switch (type) {
      case 'category':
        items = await referenceDataService.getProjectCategories(organization || '');
        break;
      case 'expenseType':
        items = await referenceDataService.getExpenseTypes(organization || '');
        break;
      case 'site':
        items = await referenceDataService.getSites(organization || '');
        break;
      default:
        return id;
    }
    
    // Find the item with matching ID
    const item = items.find(item => item.id === id);
    
    if (item && item.name) {
      logger.debug(`Resolved ${type} ID ${id} to name: ${item.name}`);
      return item.name;
    }
    
    // If not found, return the original ID
    return id;
  } catch (error) {
    logger.error(`Error resolving ${type} ID ${id}:`, error);
    return id;
  }
}

// Helper function to fetch user details from Firestore
async function fetchUserDetails(userId: string): Promise<UserReference | null> {
  try {
    logger.debug(`Fetching user details for ID: ${userId}`);
    const userDoc = await getDoc(doc(db, 'users', userId));
    
    if (userDoc.exists()) {
      const userData = userDoc.data();
      logger.debug(`Found user data:`, userData);
      return {
        id: userId,
        name: userData.name || `${userData.firstName || ''} ${userData.lastName || ''}`.trim(),
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName
      };
    } else {
      logger.warn(`User with ID ${userId} not found in Firestore`);
      return null;
    }
  } catch (error) {
    logger.error(`Error fetching user details for ${userId}:`, error);
    return null;
  }
}

export async function generateNewPREmail(context: NotificationContext): Promise<EmailContent> {
  const { pr, prNumber, isUrgent, notes, baseUrl, user } = context;
  
  if (!pr) {
    throw new Error('PR object is required');
  }

  const prUrl = `${baseUrl || 'https://1pwr.firebaseapp.com'}/pr/${pr.id}`;
  const subject = `${isUrgent ? 'URGENT: ' : ''}New PR ${prNumber} Submitted`;

  // Get approver information
  let approverName = 'Not specified';
  let approverEmail = 'Not specified';
  
  // Enhanced approver resolution logic prioritizing PR.approver as the source of truth
  if (pr.approver) {
    if (typeof pr.approver === 'string') {
      approverName = pr.approver;
      approverEmail = pr.approver;
    } else if (typeof pr.approver === 'object' && pr.approver !== null) {
      const approverObj = pr.approver as UserReference;
      if (approverObj.name) {
        approverName = approverObj.name;
      } else if (approverObj.firstName || approverObj.lastName) {
        approverName = `${approverObj.firstName || ''} ${approverObj.lastName || ''}`.trim();
      } else if (approverObj.email) {
        approverName = approverObj.email;
      }
      
      approverEmail = approverObj.email || 'Not specified';
    }
  } else if (context.approver) {
    if (context.approver.name) {
      approverName = context.approver.name;
    } else if (context.approver.firstName || context.approver.lastName) {
      approverName = `${context.approver.firstName || ''} ${context.approver.lastName || ''}`.trim();
    } else if (context.approver.email) {
      approverName = context.approver.email;
    }
    
    approverEmail = context.approver.email || 'Not specified';
  } else if (pr.approvalWorkflow?.currentApprover) {
    approverName = pr.approvalWorkflow.currentApprover;
    approverEmail = pr.approvalWorkflow.currentApprover;
  }

  // Get requestor information
  let requestorName = 'Not specified';
  let requestorEmail = 'Not specified';
  let requestorDept = pr.department || 'Not specified';
  
  // First try to get user information from the context
  if (user) {
    // First try to use the name field directly if available
    if (user.name) {
      requestorName = user.name;
    } else if (user.firstName || user.lastName) {
      requestorName = `${user.firstName || ''} ${user.lastName || ''}`.trim();
    } else if (user.email) {
      requestorName = user.email;
    }
    
    requestorEmail = user.email || 'Not specified';
  }
  
  // If we don't have user info from context, try PR fields
  if (requestorName === 'Not specified' && pr.requestor) {
    // If requestor is an object with user details
    if (typeof pr.requestor === 'object' && pr.requestor !== null) {
      const requestorObj = pr.requestor as UserReference;
      // First try to use the name field directly if available
      if (requestorObj.name) {
        requestorName = requestorObj.name;
      } else if (requestorObj.firstName || requestorObj.lastName) {
        requestorName = `${requestorObj.firstName || ''} ${requestorObj.lastName || ''}`.trim();
      } else if (requestorObj.email) {
        requestorName = requestorObj.email;
      }
      
      requestorEmail = requestorObj.email || 'Not specified';
    } else if (typeof pr.requestor === 'string') {
      // If requestor is just a string (email or ID), try to fetch user details
      const userId = pr.requestor;
      const userDetails = await fetchUserDetails(userId);
      
      if (userDetails) {
        requestorName = userDetails.name || `${userDetails.firstName || ''} ${userDetails.lastName || ''}`.trim();
        requestorEmail = userDetails.email || userId;
      } else {
        // Fallback to using the string directly
        requestorName = userId;
        requestorEmail = userId;
      }
    }
  } else if (requestorName === 'Not specified' && pr.requestorId) {
    // Fallback to requestorId if available - try to fetch user details
    const userId = pr.requestorId;
    const userDetails = await fetchUserDetails(userId);
    
    if (userDetails) {
      requestorName = userDetails.name || `${userDetails.firstName || ''} ${userDetails.lastName || ''}`.trim();
      requestorEmail = userDetails.email || userId;
    } else {
      // Fallback to using the ID directly
      requestorName = userId;
    }
  } else if (requestorName === 'Not specified' && pr.requestorEmail) {
    // Fallback to requestorEmail if available
    requestorName = pr.requestorEmail;
    requestorEmail = pr.requestorEmail;
  }
  
  // Resolve reference data IDs to human-readable names
  const requestorSite = await resolveReferenceData(pr.site || '', 'site', pr.organization);
  const categoryName = await resolveReferenceData(pr.category || '', 'category', pr.organization);
  const expenseTypeName = await resolveReferenceData(pr.expenseType || '', 'expenseType', pr.organization);

  // Get vendor name
  const vendorName = pr.preferredVendor || 'Not specified';

  const html = `
    <div style="${styles.container}">
      ${isUrgent ? `
        <div style="${styles.urgentHeader}">
          URGENT
        </div>
      ` : ''}
      
      <h2 style="${styles.header}">New Purchase Request #${prNumber} Submitted</h2>
      
      <div style="${styles.section}">
        <h3 style="${styles.subheading}">Requestor Information</h3>
        
        <table style="${styles.table}">
          <tr>
            <td style="${styles.tableCell}"><strong>Name</strong></td>
            <td style="${styles.tableCell}">${requestorName}</td>
          </tr>
          <tr>
            <td style="${styles.tableCell}"><strong>Email</strong></td>
            <td style="${styles.tableCell}">${requestorEmail}</td>
          </tr>
          <tr>
            <td style="${styles.tableCell}"><strong>Department</strong></td>
            <td style="${styles.tableCell}">${requestorDept}</td>
          </tr>
          <tr>
            <td style="${styles.tableCell}"><strong>Site</strong></td>
            <td style="${styles.tableCell}">${requestorSite}</td>
          </tr>
        </table>
      </div>

      <div style="${styles.section}">
        <h3 style="${styles.subheading}">PR Details</h3>
        
        <table style="${styles.table}">
          <tr>
            <td style="${styles.tableCell}"><strong>PR Number</strong></td>
            <td style="${styles.tableCell}">${prNumber}</td>
          </tr>
          <tr>
            <td style="${styles.tableCell}"><strong>Approver</strong></td>
            <td style="${styles.tableCell}">${approverName}</td>
          </tr>
          <tr>
            <td style="${styles.tableCell}"><strong>Category</strong></td>
            <td style="${styles.tableCell}">${categoryName}</td>
          </tr>
          <tr>
            <td style="${styles.tableCell}"><strong>Expense Type</strong></td>
            <td style="${styles.tableCell}">${expenseTypeName}</td>
          </tr>
          <tr>
            <td style="${styles.tableCell}"><strong>Total Amount</strong></td>
            <td style="${styles.tableCell}">${formatCurrency(pr.estimatedAmount)}</td>
          </tr>
          <tr>
            <td style="${styles.tableCell}"><strong>Vendor</strong></td>
            <td style="${styles.tableCell}">${vendorName}</td>
          </tr>
          <tr>
            <td style="${styles.tableCell}"><strong>Required Date</strong></td>
            <td style="${styles.tableCell}">${formatDate(pr.requiredDate)}</td>
          </tr>
          ${pr.description ? `
          <tr>
            <td style="${styles.tableCell}"><strong>Description</strong></td>
            <td style="${styles.tableCell}">${pr.description}</td>
          </tr>
          ` : ''}
        </table>
      </div>

      ${pr.lineItems?.length ? `
        <div style="${styles.section}">
          <h3 style="${styles.subheading}">Line Items</h3>
          <table style="${styles.table}">
            <tr>
              <th style="${styles.tableHeader}">Description</th>
              <th style="${styles.tableHeader}">Quantity</th>
              <th style="${styles.tableHeader}">UOM</th>
            </tr>
            ${pr.lineItems.map(item => `
              <tr>
                <td style="${styles.tableCell}">${item.description}</td>
                <td style="${styles.tableCell}">${item.quantity}</td>
                <td style="${styles.tableCell}">${item.uom}</td>
              </tr>
            `).join('')}
          </table>
        </div>
      ` : ''}

      <div style="${styles.buttonContainer}">
        <a href="${prUrl}" style="${styles.button}">View Purchase Request</a>
      </div>
    </div>
  `;

  const text = `
New PR ${prNumber} Submitted

Requestor Information:
Name: ${requestorName}
Email: ${requestorEmail}
Department: ${requestorDept}
Site: ${requestorSite}

PR Details:
PR Number: ${prNumber}
Approver: ${approverName}
Category: ${categoryName}
Expense Type: ${expenseTypeName}
Total Amount: ${formatCurrency(pr.estimatedAmount)}
Vendor: ${vendorName}
Required Date: ${formatDate(pr.requiredDate)}
${pr.description ? `Description: ${pr.description}` : ''}

View PR: ${prUrl}
`;

  return {
    subject,
    html,
    text,
    headers: generateEmailHeaders({
      prId: pr.id,
      prNumber,
      subject,
      notificationType: 'NEW_PR_SUBMITTED'
    })
  };
}
