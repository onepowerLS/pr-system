import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../../config/firebase';
import { NotificationContext, Recipients, EmailContent, StatusTransitionHandler } from '../types';
import { generateRevisionRequiredEmail } from '../templates/revisionRequiredTemplate';

export class SubmittedToRevisionRequiredHandler implements StatusTransitionHandler {
  async getRecipients(context: NotificationContext): Promise<Recipients> {
    // Primary recipient is the PR requestor
    const recipients: Recipients = {
      to: [],
      cc: ['procurement@1pwrafrica.com'] // Procurement team always in CC
    };

    if (context.pr.requestor?.email) {
      recipients.to.push(context.pr.requestor.email);
    }

    return recipients;
  }

  async getEmailContent(context: NotificationContext): Promise<EmailContent> {
    return generateRevisionRequiredEmail(context);
  }
}
