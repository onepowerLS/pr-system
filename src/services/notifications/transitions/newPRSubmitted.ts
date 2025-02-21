import { StatusTransitionHandler, NotificationContext, Recipients, EmailContent } from '../types';
import { PROCUREMENT_EMAIL } from '../../../utils/environment';
import { generateNewPREmail } from '../templates/newPRSubmitted';

export class NewPRSubmittedHandler implements StatusTransitionHandler {
  async getRecipients(context: NotificationContext): Promise<Recipients> {
    return {
      to: [PROCUREMENT_EMAIL],
      cc: context.user?.email ? [context.user.email] : []
    };
  }

  async getEmailContent(context: NotificationContext): Promise<EmailContent> {
    return generateNewPREmail(context);
  }
}
