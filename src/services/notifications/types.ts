import { User } from '../../types/user';
import { PRStatus } from '../../types/pr';

export interface Recipients {
  to: string[];
  cc?: string[];
}

export interface EmailContent {
  subject: string;
  text: string;
  html: string;
}

export interface NotificationContext {
  prId: string;
  prNumber: string;
  oldStatus: PRStatus;
  newStatus: PRStatus;
  user?: {
    email: string;
    firstName?: string;
    lastName?: string;
  };
  notes?: string;
  metadata?: Record<string, any>;
}

export interface StatusTransitionHandler {
  getRecipients(context: NotificationContext): Promise<Recipients>;
  getEmailContent(context: NotificationContext): Promise<EmailContent>;
  beforeTransition?(context: NotificationContext): Promise<void>;
  afterTransition?(context: NotificationContext): Promise<void>;
}
