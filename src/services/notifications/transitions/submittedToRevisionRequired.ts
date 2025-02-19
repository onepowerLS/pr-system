import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../../config/firebase';
import { NotificationContext, NotificationRecipients, EmailContent, StatusTransitionHandler } from '../types';

export class SubmittedToRevisionRequiredHandler implements StatusTransitionHandler {
  async getRecipients(context: NotificationContext): Promise<NotificationRecipients> {
    const { prId } = context;
    const recipients: NotificationRecipients = {
      to: ['procurement@1pwrafrica.com'], // Procurement team is primary recipient
      cc: []
    };

    // Get PR data to find requestor
    const prRef = doc(db, 'purchaseRequests', prId);
    const prDoc = await getDoc(prRef);
    
    if (!prDoc.exists()) {
      throw new Error('PR not found');
    }

    const pr = prDoc.data();

    // Add requestor to CC list
    if (pr.requestor?.email) {
      recipients.cc.push(pr.requestor.email);
    }

    return recipients;
  }

  async getEmailContent(context: NotificationContext): Promise<EmailContent> {
    const { prNumber, oldStatus, newStatus, notes } = context;

    const text = `PR ${prNumber} status has changed from ${oldStatus} to ${newStatus}\n` +
      (notes ? `Notes: ${notes}\n` : '');

    const html = `
        <p>PR ${prNumber} status has changed from ${oldStatus} to ${newStatus}</p>
        ${notes ? `<p><strong>Notes:</strong> ${notes}</p>` : ''}
        <p><a href="http://localhost:5173/pr/${context.prId}">View PR Details</a></p>
     `;

    return {
      text,
      html
    };
  }
}
