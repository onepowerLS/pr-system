import { styles } from './styles';
import { PR } from '../../../types/pr';

interface TemplateData {
  prNumber: string;
  pr: PR;
  isUrgent?: boolean;
  notes?: string;
  actionBy?: string;
  baseUrl: string;
}

export function generatePRDetailsTable(data: TemplateData): string {
  const { pr } = data;
  
  // Format currency amount with proper locale
  const formattedAmount = pr.estimatedAmount 
    ? new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: pr.currency || 'LSL'
      }).format(pr.estimatedAmount)
    : 'Not specified';

  // Get current approver from the workflow
  const currentApprover = pr.approvalWorkflow?.currentApprover || 'Not assigned';

  // Format requestor details safely
  const requestorName = pr.requestor 
    ? `${pr.requestor.firstName || ''} ${pr.requestor.lastName || ''}`.trim() || 'Not specified'
    : 'Not specified';
  const requestorEmail = pr.requestor?.email || 'Not specified';
  const requestorDepartment = pr.requestor?.department || 'Not specified';

  return `
    <table style="${styles.table}">
      <tr><th colspan="2" style="${styles.th}">Requestor Information</th></tr>
      <tr>
        <th style="${styles.th}">Name</th>
        <td style="${styles.td}">${requestorName}</td>
      </tr>
      <tr>
        <th style="${styles.th}">Email</th>
        <td style="${styles.td}">${requestorEmail}</td>
      </tr>
      <tr>
        <th style="${styles.th}">Department</th>
        <td style="${styles.td}">${requestorDepartment}</td>
      </tr>
      <tr>
        <th style="${styles.th}">Site</th>
        <td style="${styles.td}">${pr.site || 'Not specified'}</td>
      </tr>

      <tr><th colspan="2" style="${styles.th}">PR Summary</th></tr>
      <tr>
        <th style="${styles.th}">PR Number</th>
        <td style="${styles.td}">${data.prNumber}</td>
      </tr>
      <tr>
        <th style="${styles.th}">Category</th>
        <td style="${styles.td}">${pr.category || 'Not specified'}</td>
      </tr>
      <tr>
        <th style="${styles.th}">Expense Type</th>
        <td style="${styles.td}">${pr.expenseType || 'Not specified'}</td>
      </tr>
      <tr>
        <th style="${styles.th}">Estimated Amount</th>
        <td style="${styles.td}">${formattedAmount}</td>
      </tr>
      <tr>
        <th style="${styles.th}">Vendor</th>
        <td style="${styles.td}">${pr.vendor || 'Not specified'}</td>
      </tr>
      <tr>
        <th style="${styles.th}">Required Date</th>
        <td style="${styles.td}">${pr.requiredDate || 'Not specified'}</td>
      </tr>
      <tr>
        <th style="${styles.th}">Current Approver</th>
        <td style="${styles.td}">${currentApprover}</td>
      </tr>
      <tr>
        <th style="${styles.th}">Description</th>
        <td style="${styles.td}">${pr.description || 'No description provided'}</td>
      </tr>
    </table>
  `;
}

export function generateLineItemsTable(data: TemplateData): string {
  const { pr } = data;
  if (!pr.lineItems?.length) return '';

  const lineItemsRows = pr.lineItems.map(item => {
    const itemTotal = (item.quantity || 0) * (item.unitPrice || 0);
    const formattedUnitPrice = item.unitPrice
      ? new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: pr.currency || 'LSL'
        }).format(item.unitPrice)
      : 'Not specified';
    
    const formattedTotal = itemTotal
      ? new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: pr.currency || 'LSL'
        }).format(itemTotal)
      : 'Not specified';

    return `
      <tr style="${styles.tr}">
        <td style="${styles.td}">${item.description || 'No description'}</td>
        <td style="${styles.td}">${item.quantity || 0}</td>
        <td style="${styles.td}">${formattedUnitPrice}</td>
        <td style="${styles.td}">${formattedTotal}</td>
      </tr>
    `;
  }).join('');

  return `
    <table style="${styles.table}">
      <tr><th colspan="4" style="${styles.th}">Line Items</th></tr>
      <tr style="${styles.tr}">
        <th style="${styles.th}">Description</th>
        <th style="${styles.th}">Quantity</th>
        <th style="${styles.th}">Unit Price</th>
        <th style="${styles.th}">Total</th>
      </tr>
      ${lineItemsRows}
    </table>
  `;
}

export function wrapInTemplate(data: TemplateData, content: string): string {
  const { isUrgent, prNumber, baseUrl } = data;
  const headerStyle = isUrgent ? styles.urgentHeader : styles.normalHeader;
  const urgentBanner = isUrgent ? `<div style="${styles.urgentHeader}">URGENT</div>` : '';

  return `
    <div style="${styles.container}">
      ${urgentBanner}
      <div style="${headerStyle}">
        <h1>PR #${prNumber}</h1>
      </div>
      ${content}
      <a href="${baseUrl}/pr/${data.pr.id}" style="${styles.button}">View PR Details</a>
    </div>
  `;
}
