import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../../config/firebase';
import { NotificationContext, NotificationRecipients, EmailContent, StatusTransitionHandler } from '../types';
import { generatePRLink } from '../utils';

export class InQueueToPendingApprovalHandler implements StatusTransitionHandler {
  async getRecipients(context: NotificationContext): Promise<NotificationRecipients> {
    const { prId } = context;
    const recipients: NotificationRecipients = {
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
    const prLink = generatePRLink(prId);

    // Get PR details
    const prRef = doc(db, 'purchaseRequests', prId);
    const prDoc = await getDoc(prRef);
    
    if (!prDoc.exists()) {
      throw new Error('PR not found');
    }

    const pr = prDoc.data();

    // Get approver details
    let approverName = 'Unknown';
    if (pr.approvalWorkflow?.currentApprover) {
      const approverDoc = await getDoc(doc(db, 'users', pr.approvalWorkflow.currentApprover));
      if (approverDoc.exists()) {
        const approverData = approverDoc.data();
        approverName = `${approverData.firstName} ${approverData.lastName}`;
      }
    }

    const text = `Action Required: PR #${prNumber} Needs Your Approval

A purchase request has been pushed for your approval:

PR Details:
- Description: ${pr.description || 'No description provided'}
- Amount: ${pr.currency || 'Unknown'} ${pr.estimatedAmount || 0}
- Department: ${pr.department || 'No department specified'}
- Required Date: ${pr.requiredDate || 'No date specified'}
- Pushed by: ${user?.email || 'Unknown'}
- Assigned Approver: ${approverName}

Please review and take action on this PR by visiting: ${prLink}`;

    const html = `
<h2>Action Required: PR #${prNumber} Needs Your Approval</h2>

<p>A purchase request has been pushed for your approval.</p>

<h3>PR Details:</h3>
<ul>
    <li><strong>Description:</strong> ${pr.description || 'No description provided'}</li>
    <li><strong>Amount:</strong> ${pr.currency || 'Unknown'} ${pr.estimatedAmount || 0}</li>
    <li><strong>Department:</strong> ${pr.department || 'No department specified'}</li>
    <li><strong>Required Date:</strong> ${pr.requiredDate || 'No date specified'}</li>
    <li><strong>Pushed by:</strong> ${user?.email || 'Unknown'}</li>
    <li><strong>Assigned Approver:</strong> ${approverName}</li>
</ul>

<p>Please <a href="${prLink}">click here</a> to review and take action on this PR.</p>`;

    return {
      subject: `Action Required: PR #${prNumber} Needs Your Approval`,
      text,
      html
    };
  }
}
