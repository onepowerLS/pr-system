import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../../config/firebase';
import { NotificationContext, Recipients, EmailContent, StatusTransitionHandler } from '../types';
import { getBaseUrl } from '../../../utils/environment';

export class InQueueToPendingApprovalHandler implements StatusTransitionHandler {
  async getRecipients(context: NotificationContext): Promise<Recipients> {
    const { prId } = context;
    const recipients: Recipients = {
      to: [],
      cc: []
    };

    // Get PR data to find approver and requestor
    const prRef = doc(db, 'purchaseRequests', prId);
    const prDoc = await getDoc(prRef);
    
    if (!prDoc.exists()) {
      throw new Error('PR not found');
    }

    const pr = prDoc.data();

    // Add current approver as primary recipient
    if (pr.approvalWorkflow?.currentApprover) {
      const approverDoc = await getDoc(doc(db, 'users', pr.approvalWorkflow.currentApprover));
      if (approverDoc.exists()) {
        recipients.to.push(approverDoc.data().email);
      }
    }

    // Add requestor to CC
    if (pr.requestor?.id) {
      const requestorDoc = await getDoc(doc(db, 'users', pr.requestor.id));
      if (requestorDoc.exists()) {
        recipients.cc?.push(requestorDoc.data().email);
      }
    }

    // Add procurement team to CC
    recipients.cc?.push('procurement@1pwrafrica.com');

    return recipients;
  }

  async getEmailContent(context: NotificationContext): Promise<EmailContent> {
    const { prId, prNumber, user } = context;
    const baseUrl = getBaseUrl();

    // Get PR details
    const prRef = doc(db, 'purchaseRequests', prId);
    const prDoc = await getDoc(prRef);
    
    if (!prDoc.exists()) {
      throw new Error('PR not found');
    }

    const pr = prDoc.data();
    const userName = user ? `${user.firstName} ${user.lastName}`.trim() : 'System';

    // Format amount with currency
    const amount = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: pr.currency || 'USD'
    }).format(pr.amount || 0);

    const subject = `PR #${prNumber} Ready for Approval`;
    const text = `PR #${prNumber} is ready for your approval.\n\n` +
      `Details:\n` +
      `- Amount: ${amount}\n` +
      `- Department: ${pr.department}\n` +
      `- Required Date: ${pr.requiredDate}\n` +
      `- Description: ${pr.description}\n` +
      `- Pushed by: ${userName}\n\n` +
      `View PR at: ${baseUrl}/pr/${prId}`;

    const html = `
      <p>PR #${prNumber} is ready for your approval.</p>
      <h3>Details:</h3>
      <ul>
        <li><strong>Amount:</strong> ${amount}</li>
        <li><strong>Department:</strong> ${pr.department}</li>
        <li><strong>Required Date:</strong> ${pr.requiredDate}</li>
        <li><strong>Description:</strong> ${pr.description}</li>
        <li><strong>Pushed by:</strong> ${userName}</li>
      </ul>
      <p><a href="${baseUrl}/pr/${prId}">View PR Details</a></p>
    `;

    return {
      subject,
      text,
      html
    };
  }
}
