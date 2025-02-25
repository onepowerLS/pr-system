import { NotificationContext, EmailContent } from '../types';
import { generateEmailHeaders } from '../types/emailHeaders';
import { generateTable } from './baseTemplate';
import { styles } from './styles';

export function generateResubmittedEmail(context: NotificationContext): EmailContent {
  const { pr, prNumber, user, notes, baseUrl, isUrgent } = context;
  const prUrl = `${baseUrl}/pr/${pr.id}`;
  
  const subject = `${isUrgent ? 'URGENT: ' : ''}PR ${prNumber} Has Been Resubmitted`;
  
  const requestorDetails = [
    ['Name', pr.requestor?.firstName && pr.requestor?.lastName ? 
      `${pr.requestor.firstName} ${pr.requestor.lastName}` : 'Not specified'],
    ['Email', pr.requestor?.email || 'Not specified'],
    ['Department', pr.requestor?.department || 'Not specified'],
    ['Site', pr.site || 'Not specified'],
  ];

  const prSummary = [
    ['PR Number', prNumber || 'Not specified'],
    ['Category', pr.category || 'Not specified'],
    ['Expense Type', pr.expenseType || 'Not specified'],
    ['Total Amount', pr.estimatedAmount ? pr.estimatedAmount.toLocaleString('en-US', { 
      style: 'currency', 
      currency: pr.currency || 'USD' 
    }) : 'Not specified'],
    ['Vendor', pr.preferredVendor || 'Not specified'],
    ['Required Date', pr.requiredDate ? new Date(pr.requiredDate).toLocaleDateString() : 'Not specified'],
  ];

  const html = `
    <div style="${styles.container}">
      ${isUrgent ? `<div style="${styles.urgentHeader}">URGENT</div>` : ''}
      <h2 style="${styles.header}">Purchase Request #${prNumber} Has Been Resubmitted</h2>
      
      <div style="${styles.section}">
        <h3 style="${styles.subHeader}">Resubmission Details</h3>
        <p style="${styles.paragraph}">
          <strong>Requestor:</strong> ${user ? `${user.firstName} ${user.lastName}` : 'System'}
        </p>
        ${notes ? `
          <p style="${styles.paragraph}">
            <strong>Notes:</strong> ${notes}
          </p>
        ` : ''}
      </div>

      <div style="${styles.section}">
        <h3 style="${styles.subHeader}">Requestor Information</h3>
        ${generateTable(requestorDetails)}
      </div>

      <div style="${styles.section}">
        <h3 style="${styles.subHeader}">PR Details</h3>
        ${generateTable(prSummary)}
      </div>

      <div style="${styles.buttonContainer}">
        <a href="${prUrl}" style="${styles.button}">View Purchase Request</a>
      </div>
    </div>
  `;

  const text = `
PR ${prNumber} Has Been Resubmitted

Requestor: ${user ? `${user.firstName} ${user.lastName}` : 'System'}
${notes ? `Notes: ${notes}\n` : ''}

Requestor Information:
${requestorDetails.map(([key, value]) => `${key}: ${value}`).join('\n')}

PR Details:
${prSummary.map(([key, value]) => `${key}: ${value}`).join('\n')}

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
