import { NotificationContext, EmailContent } from './types';
import { generateTable } from './baseTemplate';
import { styles } from './styles';

export function generateNewPREmail(context: NotificationContext): EmailContent {
  try {
    const { pr, prNumber, user, notes, baseUrl, isUrgent } = context;
    const prUrl = `${baseUrl}/pr/${pr.id}`;
    
    const subject = `${isUrgent ? 'URGENT: ' : ''}New PR ${prNumber} Submitted`;
    
    const requestorDetails = [
      ['Name', pr.requestor?.firstName && pr.requestor?.lastName ? 
        `${pr.requestor.firstName} ${pr.requestor.lastName}` : pr.requestor || 'Not specified'],
      ['Email', pr.requestor?.email || pr.email || 'Not specified'],
      ['Department', pr.requestor?.department || pr.department || 'Not specified'],
      ['Site', pr.site || 'Not specified'],
    ];

    const prSummary = [
      ['PR Number', prNumber || 'Not specified'],
      ['Category', pr.projectCategory || pr.category || 'Not specified'],
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
        <h2 style="${styles.header}">New Purchase Request #${prNumber} Submitted</h2>
        
        <div style="${styles.section}">
          <h3 style="${styles.subHeader}">Submission Details</h3>
          <p style="${styles.paragraph}">
            <strong>Submitted By:</strong> ${user ? `${user.firstName} ${user.lastName}` : 'System'}
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
New PR ${prNumber} Submitted

Submitted By: ${user ? `${user.firstName} ${user.lastName}` : 'System'}
${notes ? `Notes: ${notes}\n` : ''}

Requestor Information:
${requestorDetails.map(([key, value]) => `${key}: ${value}`).join('\n')}

PR Details:
${prSummary.map(([key, value]) => `${key}: ${value}`).join('\n')}

View PR: ${prUrl}
    `.trim();

    return { subject, html, text };
  } catch (error) {
    console.error('Error generating new PR email:', error);
    return {
      subject: 'New PR Submitted',
      html: `<p>There was an error generating the email content. Please view the PR for details.</p>`,
      text: 'There was an error generating the email content. Please view the PR for details.'
    };
  }
}
