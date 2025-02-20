import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../../config/firebase';
import { NotificationContext, NotificationRecipients, EmailContent, StatusTransitionHandler } from '../types';

export class SubmittedToRevisionRequiredHandler implements StatusTransitionHandler {
  async getRecipients(context: NotificationContext): Promise<NotificationRecipients> {
    const { prId } = context;
    const recipients: NotificationRecipients = {
      to: [], // Requestor is primary recipient
      cc: ['procurement@1pwrafrica.com'] // Procurement team in CC
    };

    // Get PR data to find requestor
    const prRef = doc(db, 'purchaseRequests', prId);
    const prDoc = await getDoc(prRef);
    
    if (!prDoc.exists()) {
      throw new Error('PR not found');
    }

    const pr = prDoc.data();

    // Add requestor as primary recipient
    if (pr.requestor?.email) {
      recipients.to.push(pr.requestor.email);
    }

    return recipients;
  }

  async getEmailContent(context: NotificationContext): Promise<EmailContent> {
    const { prNumber, user, notes } = context;
    const userName = user ? `${user.firstName} ${user.lastName}`.trim() : 'System';

    const subject = `PR #${prNumber} Requires Revision`;
    const text = `Your PR #${prNumber} requires revision.\n` +
      `Requested by: ${userName}\n` +
      (notes ? `Notes: ${notes}\n` : '');

    const html = `
        <p>Your PR #${prNumber} requires revision.</p>
        <p><strong>Requested by:</strong> ${userName}</p>
        ${notes ? `<p><strong>Notes:</strong> ${notes}</p>` : ''}
        <p><a href="http://localhost:5173/pr/${context.prId}">View PR Details</a></p>
     `;

    return {
      subject,
      text,
      html
    };
  }
}
