import { EmailContent, NotificationContext } from '../types';
import { styles } from './styles';
import { generateTable, TableRow } from './baseTemplate';
import { logger } from '@/utils/logger';
import { generateEmailHeaders } from '../types/emailHeaders';
import { PRRequest, UserReference } from '@/types/pr';

export function generateNewPREmail(params: {
  pr: PRRequest;
  prNumber: string;
  approver?: UserReference | string;
  baseUrl?: string;
  submitter?: {
    firstName?: string;
    lastName?: string;
    email?: string;
    name?: string;
  };
}): EmailContent {
  const { pr, prNumber, approver, baseUrl = 'https://1pwr.firebaseapp.com', submitter } = params;
  
  try {
    const prUrl = `${baseUrl}/pr/${pr.id}`;
    
    const isUrgent = pr.isUrgent || false;
    const subject = `${isUrgent ? 'URGENT: ' : ''}New PR ${prNumber} Submitted`;
    
    // Format approver information if available
    let approverName = 'Not assigned yet';
    let approverEmail = 'Not available';
    
    // Enhanced approver resolution logic prioritizing PR.approver as the source of truth
    // First check if we were provided with a resolved approver
    if (approver) {
      logger.debug('Using provided approver object in email template', approver);
      
      // Check if approver is just an ID string
      if (typeof approver === 'string') {
        approverName = `Approver (ID: ${approver})`;
      } 
      // Check if it's a full object
      else if (typeof approver === 'object' && approver !== null) {
        const typedApprover = approver as { 
          name?: string; 
          firstName?: string; 
          lastName?: string; 
          id?: string;
          email?: string;
        };
        
        // First try to use name directly if available
        if (typedApprover.name) {
          approverName = typedApprover.name;
        }
        // Otherwise try to construct from first and last name
        else if (typedApprover.firstName || typedApprover.lastName) {
          approverName = `${typedApprover.firstName || ''} ${typedApprover.lastName || ''}`.trim();
        }
        // Fall back to ID if no name components are available
        else {
          approverName = `Approver (ID: ${typedApprover.id || 'Unknown'})`;
        }
        
        approverEmail = typedApprover.email || 'Not available';
      }
    }
    
    // Format submitter information with improved name handling
    let submitterName = 'Not specified';
    
    if (submitter) {
      // First try to use name directly if available
      if (submitter.name) {
        submitterName = submitter.name;
      }
      // Otherwise try to construct from first and last name
      else if (submitter.firstName || submitter.lastName) {
        submitterName = `${submitter.firstName || ''} ${submitter.lastName || ''}`.trim();
      }
      // Fall back to email if no name components are available
      else if (submitter.email) {
        submitterName = submitter.email;
      }
    }
    
    // Safely get requestor details with improved name handling
    let requestorName = 'Not specified';
    
    if (pr.requestor) {
      // First try to use name directly if available
      if (pr.requestor.name) {
        requestorName = pr.requestor.name;
      }
      // Otherwise try to construct from first and last name
      else if (pr.requestor.firstName || pr.requestor.lastName) {
        requestorName = `${pr.requestor.firstName || ''} ${pr.requestor.lastName || ''}`.trim();
      }
      // Fall back to email if no name components are available
      else if (pr.requestor.email) {
        requestorName = pr.requestor.email;
      }
    }
    
    const requestorEmail = pr.requestorEmail || pr.requestor?.email || 'Not specified';
    const requestorDept = pr.department || pr.requestor?.department || 'Not specified';
    const requestorSite = pr.site || 'Not specified';
    
    // Format currency amount if available
    const formattedAmount = pr.estimatedAmount 
      ? `${pr.currency || 'LSL'}\u00A0${Number(pr.estimatedAmount).toFixed(2)}`
      : 'N/A';
    
    // Build the email content
    const htmlContent = `
      <div style="${styles.container}">
        ${isUrgent ? `<div style="${styles.urgentBadge}">URGENT</div>` : ''}
        <h2 style="${styles.heading}">New Purchase Request #${prNumber} Submitted</h2>
      
        <div style="${styles.section}">
          <h3 style="${styles.subheading}">Submission Details</h3>
          <p style="${styles.paragraph}">
            <strong>Submitted By:</strong> ${submitterName}
          </p>
        
        </div>

        <div style="${styles.section}">
          <h3 style="${styles.subheading}">Requestor Information</h3>
        
    ${generateTable([
      { label: 'Name', value: requestorName },
      { label: 'Email', value: requestorEmail },
      { label: 'Department', value: requestorDept },
      { label: 'Site', value: requestorSite }
    ])}
        </div>

        <div style="${styles.section}">
          <h3 style="${styles.subheading}">PR Details</h3>
        
    ${generateTable([
      { label: 'PR Number', value: prNumber },
      { label: 'Category', value: pr.category || 'Not specified' },
      { label: 'Expense Type', value: pr.expenseType || 'Not specified' },
      { label: 'Total Amount', value: formattedAmount },
      { label: 'Vendor', value: pr.preferredVendor || 'Not specified' },
      { label: 'Required Date', value: pr.requiredDate || 'Not specified' }
    ])}
        </div>

        <div style="${styles.buttonContainer}">
          <a href="${prUrl}" style="${styles.button}">View Purchase Request</a>
        </div>
      </div>
       `;
    
    // Plain text version
    const plainText = `New PR ${prNumber} Submitted

Submitted By: ${submitterName}

Requestor Information:
Name: ${requestorName}
Email: ${requestorEmail}
Department: ${requestorDept}
Site: ${requestorSite}

PR Details:
PR Number: ${prNumber}
Category: ${pr.category || 'Not specified'}
Expense Type: ${pr.expenseType || 'Not specified'}
Total Amount: ${formattedAmount}
Vendor: ${pr.preferredVendor || 'Not specified'}
Required Date: ${pr.requiredDate || 'Not specified'}

View PR: ${prUrl}`;

    // Generate simplified headers
    const headers = generateEmailHeaders({
      prId: pr.id,
      prNumber,
      subject,
      notificationType: 'new-pr'
    });
    
    // Return the complete email content
    return {
      headers,
      subject,
      html: htmlContent,
      text: plainText
    };
  } catch (error) {
    logger.error('Error generating new PR email', error);
    
    // Return a fallback email if there's an error
    return {
      subject: `New PR Submitted`,
      html: `<p>A new PR has been submitted. Please check the system for details.</p>`,
      text: `A new PR has been submitted. Please check the system for details.`
    };
  }
}
