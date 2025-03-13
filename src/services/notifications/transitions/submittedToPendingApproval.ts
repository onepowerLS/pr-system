import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../../config/firebase';
import { StatusTransitionHandler, NotificationContext, Recipients, EmailContent } from '../types';
import { getBaseUrl } from '../../../utils/environment';

export class SubmittedToPendingApprovalHandler implements StatusTransitionHandler {
  async getRecipients(context: NotificationContext): Promise<Recipients> {
    const { prId } = context;
    const recipients: Recipients = {
      to: [], // Will be filled with approver
      cc: [] // Will be filled with requestor and procurement
    };

    // Get PR data to find approver and requestor
    const prRef = doc(db, 'purchaseRequests', prId);
    const prDoc = await getDoc(prRef);
    
    if (!prDoc.exists()) {
      throw new Error('PR not found');
    }

    const pr = prDoc.data();

    // Add current approver as primary recipient - prioritize pr.approver as the single source of truth
    if (pr.approver) {
      // If approver is an object with email
      if (typeof pr.approver === 'object' && pr.approver?.email) {
        recipients.to.push(pr.approver.email);
      } 
      // If approver is a string and looks like an email
      else if (typeof pr.approver === 'string' && pr.approver.includes('@')) {
        recipients.to.push(pr.approver);
      }
      // If approver is just an ID, we'll need to fetch the user details
      else {
        // This would require additional code to fetch user details by ID
        console.log('Approver ID found, but email not available directly:', pr.approver);
      }
    }
    // Fallback to approvalWorkflow.currentApprover only if pr.approver is not available
    else if (pr.approvalWorkflow?.currentApprover?.email) {
      recipients.to.push(pr.approvalWorkflow.currentApprover.email);
    }

    // Add requestor to CC - check multiple possible locations for the email
    // First try the requestor object structure
    if (pr.requestor?.email) {
      recipients.cc.push(pr.requestor.email);
    } 
    // Then try the requestorEmail field directly
    else if (pr.requestorEmail) {
      recipients.cc.push(pr.requestorEmail);
    }
    
    // Ensure we always have the requestor email
    if (recipients.cc.length === 0 && pr.requestor) {
      // Last resort - try to extract email from the requestor string if it's an email format
      const requestorString = pr.requestor.toString();
      if (requestorString.includes('@')) {
        recipients.cc.push(requestorString);
      }
    }

    // Add procurement to CC
    recipients.cc.push('procurement@1pwrafrica.com');

    // Log the recipients for debugging
    console.log('Notification recipients for pending approval:', {
      to: recipients.to,
      cc: recipients.cc,
      pr: {
        requestor: pr.requestor,
        requestorEmail: pr.requestorEmail
      }
    });

    return recipients;
  }

  async getEmailContent(context: NotificationContext): Promise<EmailContent> {
    const { prNumber, user, notes, prId } = context;
    const userName = user ? `${user.firstName} ${user.lastName}`.trim() : 'System';
    const baseUrl = getBaseUrl();

    // Get PR details for the email
    const prRef = doc(db, 'purchaseRequests', prId);
    const prDoc = await getDoc(prRef);
    const pr = prDoc.data();

    const subject = `PR #${prNumber} Ready for Approval`;
    const text = `PR #${prNumber} is ready for your approval.\n` +
      `Submitted by: ${pr?.requestor?.name || 'Unknown'}\n` +
      `Department: ${pr?.department || 'N/A'}\n` +
      `Amount: ${pr?.estimatedAmount || 0} ${pr?.currency || 'USD'}\n` +
      (notes ? `Notes: ${notes}\n` : '') +
      `\nPlease review and approve/reject at: ${baseUrl}/pr/${prId}`;

    const html = `
      <h2>PR #${prNumber} Ready for Approval</h2>
      <p>A purchase request requires your approval.</p>
      <table style="border-collapse: collapse; width: 100%; max-width: 600px; margin: 20px 0;">
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd;"><strong>Submitted by:</strong></td>
          <td style="padding: 8px; border: 1px solid #ddd;">${pr?.requestor?.name || 'Unknown'}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd;"><strong>Department:</strong></td>
          <td style="padding: 8px; border: 1px solid #ddd;">${pr?.department || 'N/A'}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd;"><strong>Amount:</strong></td>
          <td style="padding: 8px; border: 1px solid #ddd;">${pr?.estimatedAmount || 0} ${pr?.currency || 'USD'}</td>
        </tr>
      </table>
      ${notes ? `<p><strong>Notes:</strong> ${notes}</p>` : ''}
      <p><a href="${baseUrl}/pr/${prId}" style="display: inline-block; padding: 10px 20px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px;">Review PR</a></p>
    `;

    return { subject, text, html };
  }
}
