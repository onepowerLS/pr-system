import { NotificationContext, EmailContent } from '../types';
import { generateEmailHeaders } from '../types/emailHeaders';
import { styles } from './styles';

export function generateNewPREmail(context: NotificationContext): EmailContent {
  const { pr, prNumber, isUrgent, notes, baseUrl } = context;
  const prUrl = `${baseUrl}/pr/${pr.id}`;
  
  // Format the subject with proper prefix
  const subject = `${isUrgent ? 'URGENT: ' : ''}New Purchase Request: PR #${prNumber}`;
  const boundary = `--_NmP-${Math.random().toString(36).substring(2)}-Part_1`;
  
  // Safely format currency amounts
  const formatCurrency = (amount: number | null | undefined): string => {
    if (amount === null || amount === undefined || isNaN(amount)) return 'Not specified';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: pr.currency || 'LSL'
    }).format(amount);
  };

  // Format date
  const formatDate = (dateStr: string): string => {
    if (!dateStr) return 'Not specified';
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return 'Not specified';
    }
  };

  // Safely get requestor details
  const requestorName = pr.requestor ? 
    `${pr.requestor.firstName || ''} ${pr.requestor.lastName || ''}`.trim() || 'Not specified' : 
    'Not specified';
  const requestorEmail = pr.requestor?.email || 'Not specified';
  const requestorDept = pr.requestor?.department || 'Not specified';
  const requestorSite = pr.site || 'Not specified';

  // Calculate total amount from line items
  const totalAmount = pr.lineItems?.reduce((sum, item) => {
    const quantity = item.quantity || 0;
    const unitPrice = item.unitPrice || 0;
    return sum + (quantity * unitPrice);
  }, 0) || 0;

  const html = `
    <div style="${styles.container}">
      ${isUrgent ? `
        <div style="${styles.urgentHeader}">
          URGENT
        </div>
      ` : ''}
      
      <h2 style="${styles.header}">Purchase Request Details</h2>
      
      <table style="${styles.table}">
        <tr>
          <td style="${styles.th}"><strong>PR Number</strong></td>
          <td style="${styles.td}">${prNumber}</td>
        </tr>
        <tr>
          <td style="${styles.th}"><strong>Requestor Name</strong></td>
          <td style="${styles.td}">${requestorName}</td>
        </tr>
        <tr>
          <td style="${styles.th}"><strong>Requestor Email</strong></td>
          <td style="${styles.td}">${requestorEmail}</td>
        </tr>
        <tr>
          <td style="${styles.th}"><strong>Department</strong></td>
          <td style="${styles.td}">${requestorDept}</td>
        </tr>
        <tr>
          <td style="${styles.th}"><strong>Site</strong></td>
          <td style="${styles.td}">${requestorSite}</td>
        </tr>
        <tr>
          <td style="${styles.th}"><strong>Category</strong></td>
          <td style="${styles.td}">${pr.category || 'Not specified'}</td>
        </tr>
        <tr>
          <td style="${styles.th}"><strong>Expense Type</strong></td>
          <td style="${styles.td}">${pr.expenseType || 'Not specified'}</td>
        </tr>
        <tr>
          <td style="${styles.th}"><strong>Required Date</strong></td>
          <td style="${styles.td}">${formatDate(pr.requiredDate)}</td>
        </tr>
        <tr>
          <td style="${styles.th}"><strong>Estimated Amount</strong></td>
          <td style="${styles.td}">${formatCurrency(totalAmount)}</td>
        </tr>
        <tr>
          <td style="${styles.th}"><strong>Description</strong></td>
          <td style="${styles.td}">${pr.description || 'Not specified'}</td>
        </tr>
      </table>

      ${pr.lineItems?.length ? `
        <h3 style="${styles.subheader}">Line Items</h3>
        <table style="${styles.table}">
          <tr>
            <th style="${styles.th}">Description</th>
            <th style="${styles.th}">Quantity</th>
            <th style="${styles.th}">Unit Price</th>
            <th style="${styles.th}">Total</th>
          </tr>
          ${pr.lineItems.map(item => {
            const quantity = item.quantity || 0;
            const unitPrice = item.unitPrice || 0;
            const total = quantity * unitPrice;
            
            return `
              <tr>
                <td style="${styles.td}">${item.description || 'Not specified'}</td>
                <td style="${styles.td}">${quantity}</td>
                <td style="${styles.td}">${formatCurrency(unitPrice)}</td>
                <td style="${styles.td}">${formatCurrency(total)}</td>
              </tr>
            `;
          }).join('')}
        </table>
      ` : '<p>No line items</p>'}

      <div style="margin-top: 20px;">
        <a href="${prUrl}" 
           target="_blank"
           style="${styles.button}">
          View Purchase Request
        </a>
      </div>
    </div>
  `;

  const text = `
${isUrgent ? 'URGENT: ' : ''}New Purchase Request: PR #${prNumber}
${'-'.repeat(50)}

Requestor Information:
- Name: ${requestorName}
- Email: ${requestorEmail}
- Department: ${requestorDept}
- Site: ${requestorSite}

PR Details:
- Category: ${pr.category || 'Not specified'}
- Expense Type: ${pr.expenseType || 'Not specified'}
- Required Date: ${formatDate(pr.requiredDate)}
- Estimated Amount: ${formatCurrency(totalAmount)}
- Description: ${pr.description || 'Not specified'}

${pr.lineItems?.length ? `
Line Items:
${pr.lineItems.map(item => {
  const quantity = item.quantity || 0;
  const unitPrice = item.unitPrice || 0;
  const total = quantity * unitPrice;
  
  return `
- ${item.description || 'Not specified'}
  Quantity: ${quantity}
  Unit Price: ${formatCurrency(unitPrice)}
  Total: ${formatCurrency(total)}
`;
}).join('')}
` : 'No line items'}

View PR: ${prUrl}
`;

  const headers = generateEmailHeaders({
    prId: pr.id,
    prNumber,
    subject,
    notificationType: 'new-pr'
  });

  const emailContent = `MIME-Version: 1.0
Content-Type: multipart/alternative; boundary="${boundary}"

--${boundary}
Content-Type: text/plain; charset=utf-8
Content-Transfer-Encoding: 7bit

${text}

--${boundary}
Content-Type: text/html; charset=utf-8
Content-Transfer-Encoding: quoted-printable

${html}
--${boundary}--`;

  return {
    headers,
    subject,
    html,
    text,
    boundary,
    content: emailContent
  };
}
