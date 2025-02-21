import { NotificationContext, EmailContent } from '../types';
import { generateEmailHeaders } from '../types/emailHeaders';
import { generateTable } from './baseTemplate';
import { styles } from './styles';

interface RevisionRequiredDetails {
  prNumber: string;
  reviewerName: string;
  revisionNotes: string;
  baseUrl: string;
  prId: string;
  isUrgent?: boolean;
  category?: string;
  expenseType?: string;
}

function extractRevisionDetails(context: NotificationContext): RevisionRequiredDetails {
  const { pr, prNumber, user, notes, isUrgent } = context;
  return {
    prNumber,
    reviewerName: user ? `${user.firstName} ${user.lastName}`.trim() : 'System',
    revisionNotes: notes || '',
    baseUrl: context.baseUrl,
    prId: pr.id,
    isUrgent,
    category: pr.category,
    expenseType: pr.expenseType
  };
}

export function generateRevisionRequiredEmail(context: NotificationContext): EmailContent {
  const { pr, prNumber, isUrgent, notes, baseUrl } = context;
  const prUrl = `${baseUrl}/pr/${pr.id}`;
  
  const subject = isUrgent ? `URGENT: PR #${prNumber} Requires Revision` : `PR #${prNumber} Requires Revision`;
  const boundary = `NmP-${Math.random().toString(36).substring(2)}-Part_1`;
  
  const requestorDetails = [
    ['Name', `${pr.requestor.firstName} ${pr.requestor.lastName}`],
    ['Email', pr.requestor.email],
    ['Department', pr.requestor.department || 'Not specified'],
    ['Site', pr.site],
  ];

  const prSummary = [
    ['PR Number', prNumber],
    ['Category', pr.category],
    ['Expense Type', pr.expenseType],
    ['Total Amount', pr.amount.toLocaleString('en-US', { style: 'currency', currency: 'USD' })],
    ['Vendor', pr.vendor || 'Not specified'],
    ['Required Date', new Date(pr.requiredDate).toLocaleDateString()],
  ];

  // Format line items table
  const lineItemsTable = pr.lineItems.map((item, index) => [
    `${index + 1}`,
    item.description,
    item.quantity.toString(),
    item.unitPrice.toLocaleString('en-US', { style: 'currency', currency: 'USD' }),
    (item.quantity * item.unitPrice).toLocaleString('en-US', { style: 'currency', currency: 'USD' })
  ]);

  const html = `
    <div style="${styles.container}">
      ${isUrgent ? `<div style="${styles.urgentHeader}">URGENT</div>` : ''}
      <h2 style="${styles.header}">Purchase Request #${prNumber} Requires Revision</h2>
      
      <h3 style="${styles.subheader}">Requestor Information</h3>
      ${generateTable('', requestorDetails)}
      
      <h3 style="${styles.subheader}">PR Summary</h3>
      ${generateTable('', prSummary)}
      
      <h3 style="${styles.subheader}">Line Items</h3>
      <table style="${styles.table}">
        <thead>
          <tr>
            <th style="${styles.th}">#</th>
            <th style="${styles.th}">Description</th>
            <th style="${styles.th}">Quantity</th>
            <th style="${styles.th}">Unit Price</th>
            <th style="${styles.th}">Total</th>
          </tr>
        </thead>
        <tbody>
          ${lineItemsTable.map(([num, desc, qty, price, total]) => `
            <tr>
              <td style="${styles.td}">${num}</td>
              <td style="${styles.td}">${desc}</td>
              <td style="${styles.td}">${qty}</td>
              <td style="${styles.td}">${price}</td>
              <td style="${styles.td}">${total}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      
      ${notes ? `<div style="${styles.notes}"><strong>Revision Notes:</strong> ${notes}</div>` : ''}
      <div style="${styles.actions}">
        <a href="${prUrl}" style="${styles.button}">View PR</a>
      </div>
    </div>
  `;

  const text = `${isUrgent ? 'URGENT: ' : ''}PR #${prNumber} Requires Revision

Requestor Information:
${requestorDetails.map(([key, value]) => `${key}: ${value}`).join('\n')}

PR Summary:
${prSummary.map(([key, value]) => `${key}: ${value}`).join('\n')}

Line Items:
${lineItemsTable.map(([num, desc, qty, price, total]) => 
  `${num}. ${desc}\n   Quantity: ${qty}, Unit Price: ${price}, Total: ${total}`
).join('\n')}

${notes ? `\nRevision Notes: ${notes}` : ''}

View PR: ${prUrl}
  `.trim();

  const headers = generateEmailHeaders({
    prId: pr.id,
    prNumber,
    subject,
    notificationType: 'revision-required'
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
