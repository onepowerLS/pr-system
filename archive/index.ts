import { NotificationContext, EmailContent } from '../types';
import { generateTable } from './baseTemplate';
import { styles } from './styles';

export function generateRevisionRequiredEmail(context: NotificationContext): EmailContent {
  const { pr, prNumber, user, notes, baseUrl, isUrgent } = context;
  const prUrl = `${baseUrl}/pr/${pr.id}`;
  
  const subject = `${isUrgent ? 'URGENT: ' : ''}PR ${prNumber} Status Changed: SUBMITTED → REVISION_REQUIRED`;
  
  const requestorDetails: [string, string][] = [
    ['Name', `${pr.requestor.firstName} ${pr.requestor.lastName}`],
    ['Email', pr.requestor.email],
    ['Department', pr.requestor.department || 'Not specified'],
    ['Site', pr.site],
  ];

  const prSummary: [string, string][] = [
    ['PR Number', prNumber],
    ['Category', pr.category],
    ['Expense Type', pr.expenseType],
    ['Total Amount', pr.amount.toLocaleString('en-US', { style: 'currency', currency: pr.currency })],
    ['Vendor', pr.vendor || 'Not specified'],
    ['Required Date', new Date(pr.requiredDate).toLocaleDateString()],
  ];

  const html = `
    <div style="${styles.container}">
      ${isUrgent ? `<div style="${styles.urgentHeader}">URGENT</div>` : ''}
      <h2 style="${styles.header}">Purchase Request #${prNumber} Requires Revision</h2>
      
      <div style="${styles.section}">
        <h3 style="${styles.subHeader}">Revision Details</h3>
        <p style="${styles.paragraph}">
          <strong>Reviewer:</strong> ${user ? `${user.firstName} ${user.lastName}` : 'System'}
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
PR ${prNumber} Requires Revision

Reviewer: ${user ? `${user.firstName} ${user.lastName}` : 'System'}
${notes ? `Notes: ${notes}\n` : ''}

Requestor Information:
${requestorDetails.map(([key, value]) => `${key}: ${value}`).join('\n')}

PR Details:
${prSummary.map(([key, value]) => `${key}: ${value}`).join('\n')}

View PR: ${prUrl}
  `.trim();

  return { subject, html, text };
}

export function generateResubmittedEmail(context: NotificationContext): EmailContent {
  // Create skeleton implementation to avoid TypeScript errors
  const { prNumber, isUrgent } = context;
  
  const subject = `${isUrgent ? 'URGENT: ' : ''}PR ${prNumber} Has Been Resubmitted`;
  
  // Similar structure to revision required, but with resubmission-specific messaging
  // Implementation follows same pattern...
  return { subject, html: '', text: '' }; // TODO: Implement full template
}

export function generatePendingApprovalEmail(context: NotificationContext): EmailContent {
  // Create skeleton implementation to avoid TypeScript errors
  const { prNumber, isUrgent } = context;
  
  const subject = `${isUrgent ? 'URGENT: ' : ''}PR ${prNumber} Awaiting Your Approval`;
  
  // Implementation follows same pattern...
  return { subject, html: '', text: '' }; // TODO: Implement full template
}

export function generateApprovedEmail(context: NotificationContext): EmailContent {
  // Create skeleton implementation to avoid TypeScript errors
  const { prNumber, isUrgent } = context;
  
  const subject = `${isUrgent ? 'URGENT: ' : ''}PR ${prNumber} Has Been Approved`;
  
  // Implementation follows same pattern...
  return { subject, html: '', text: '' }; // TODO: Implement full template
}

export function generateRejectedEmail(context: NotificationContext): EmailContent {
  // Create skeleton implementation to avoid TypeScript errors
  const { prNumber, isUrgent } = context;
  
  const subject = `${isUrgent ? 'URGENT: ' : ''}PR ${prNumber} Has Been Rejected`;
  
  // Implementation follows same pattern...
  return { subject, html: '', text: '' }; // TODO: Implement full template
}

export function generateNewPREmail(context: NotificationContext): EmailContent {
  // Create skeleton implementation to avoid TypeScript errors
  const { prNumber, isUrgent } = context;
  
  const subject = `${isUrgent ? 'URGENT: ' : ''}New Purchase Request: PR #${prNumber}`;
  
  // Implementation follows same pattern...
  return { subject, html: '', text: '' }; // TODO: Implement full template
}
