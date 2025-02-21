import { StatusTransitionHandler, NotificationContext, Recipients, EmailContent } from '../types';
import { PROCUREMENT_EMAIL } from '../../../utils/environment';

export class NewPRSubmittedHandler implements StatusTransitionHandler {
  async getRecipients(context: NotificationContext): Promise<Recipients> {
    return {
      to: [PROCUREMENT_EMAIL],
      cc: context.user?.email ? [context.user.email] : []
    };
  }

  async getEmailContent(context: NotificationContext): Promise<EmailContent> {
    const { prNumber, user } = context;
    const requesterName = user?.firstName && user?.lastName 
      ? `${user.firstName} ${user.lastName}`
      : user?.email || 'Unknown';

    return {
      subject: `New PR Submitted: PR${prNumber}`,
      text: `A new PR (PR${prNumber}) has been submitted by ${requesterName}.\n\n` +
        (context.notes ? `Notes: ${context.notes}\n` : '') +
        `\nPlease review the PR at your earliest convenience.`,
      html: `
        <h2>New PR Submitted</h2>
        <p>A new PR (PR${prNumber}) has been submitted by ${requesterName}.</p>
        ${context.notes ? `<p><strong>Notes:</strong> ${context.notes}</p>` : ''}
        <p>Please review the PR at your earliest convenience.</p>
      `
    };
  }
}
