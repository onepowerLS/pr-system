import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../../config/firebase';
import { NotificationContext, Recipients, EmailContent, StatusTransitionHandler } from '../types';
import { getBaseUrl } from '../../../utils/environment';
import { generatePendingApprovalEmail } from '../templates/pendingApprovalTemplate';

export class InQueueToPendingApprovalHandler implements StatusTransitionHandler {
  async getRecipients(context: NotificationContext): Promise<Recipients> {
    const recipients: Recipients = {
      to: [],
      cc: []
    };

    // Get PR data to find approver and requestor
    const prRef = doc(db, 'purchaseRequests', context.prId);
    const prDoc = await getDoc(prRef);
    
    if (!prDoc.exists()) {
      throw new Error('PR not found');
    }

    const pr = prDoc.data();

    // Add current approver as primary recipient - prioritize pr.approver as the single source of truth
    if (pr.approver) {
      recipients.to.push(pr.approver);
    } 
    // Fallback to approvalWorkflow.currentApprover only if pr.approver is not available
    else if (pr.approvalWorkflow?.currentApprover) {
      recipients.to.push(pr.approvalWorkflow.currentApprover);
    }

    // Add requestor in CC
    if (pr.requestor?.email) {
      recipients.cc.push(pr.requestor.email);
    }

    // Add procurement team to CC
    recipients.cc.push('procurement@1pwrafrica.com');

    return recipients;
  }

  async getEmailContent(context: NotificationContext): Promise<EmailContent> {
    return generatePendingApprovalEmail(context);
  }
}
