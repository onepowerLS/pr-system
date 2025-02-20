import { User } from '../../../types/user';
import { EmailContent, NotificationContext, Recipients, StatusTransitionHandler } from '../types';
import { db } from '../../../config/firebase';
import { doc, getDoc } from 'firebase/firestore';

export class RevisionRequiredToResubmittedHandler implements StatusTransitionHandler {
  async getRecipients(context: NotificationContext): Promise<Recipients> {
    const { prId, metadata } = context;
    const recipients: Recipients = {
      to: ['procurement@1pwrafrica.com'],
      cc: []
    };

    // Get PR data to include requestor in CC
    const prRef = doc(db, 'purchaseRequests', prId);
    const prSnap = await getDoc(prRef);
    const prData = prSnap.data();

    if (prData?.requestor?.email) {
      recipients.cc.push(prData.requestor.email);
    }

    return recipients;
  }

  async getEmailContent(context: NotificationContext): Promise<EmailContent> {
    const { prNumber, oldStatus, newStatus, user, notes } = context;
    const userName = user ? `${user.firstName} ${user.lastName}`.trim() : 'System';

    const subject = `PR #${prNumber} Resubmitted`;
    const text = `PR ${prNumber} has been resubmitted after revisions by ${userName}.\n` +
      (notes ? `Notes: ${notes}\n` : '');

    const html = `
        <p>PR ${prNumber} has been resubmitted after revisions by ${userName}.</p>
        ${notes ? `<p><strong>Notes:</strong> ${notes}</p>` : ''}
        <p><a href="${window.location.origin}/pr/${context.prId}">View PR Details</a></p>
     `;

    return { subject, text, html };
  }
}
