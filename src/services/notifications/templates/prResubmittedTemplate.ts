import { NotificationContext, EmailContent } from '../types';
import { generateEmailHeaders } from '../types/emailHeaders';
import { generateTable } from './baseTemplate';
import { styles } from './styles';

export function generatePRResubmittedEmail(context: NotificationContext): EmailContent {
  const { pr, prNumber, isUrgent, notes, baseUrl } = context;
  const prUrl = `${baseUrl}/pr/${pr.id}`;
  
  const subject = isUrgent ? `URGENT: PR #${prNumber} Resubmitted` : `PR #${prNumber} Resubmitted`;
  
  const prDetails = [
    ['Requestor', `${pr.requestor.firstName} ${pr.requestor.lastName}`],
    ['Category', pr.category],
    ['Expense Type', pr.expenseType],
    ['Site', pr.site],
    ['Amount', pr.amount.toLocaleString('en-US', { style: 'currency', currency: 'USD' })],
    ['Vendor', pr.vendor || 'Not specified'],
    ['Required Date', new Date(pr.requiredDate).toLocaleDateString()],
  ];

  const html = `
    <div style="${styles.container}">
      <h2 style="${styles.header}">Purchase Request #${prNumber} Has Been Resubmitted</h2>
      ${generateTable('PR Details', prDetails)}
      ${notes ? `<div style="${styles.notes}"><strong>Resubmission Notes:</strong> ${notes}</div>` : ''}
      <div style="${styles.actions}">
        <a href="${prUrl}" style="${styles.button}">View PR</a>
      </div>
    </div>
  `;

  const text = `
PR #${prNumber} Has Been Resubmitted

PR Details:
${prDetails.map(([key, value]) => `${key}: ${value}`).join('\n')}

${notes ? `\nResubmission Notes: ${notes}` : ''}

View PR: ${prUrl}
  `.trim();

  return {
    headers: generateEmailHeaders({
      prId: pr.id,
      prNumber,
      subject,
      notificationType: 'pr-resubmitted'
    }),
    subject,
    html,
    text,
    boundary: 'boundary-' + Date.now()
  };
}
