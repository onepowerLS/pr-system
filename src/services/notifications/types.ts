import { User } from '../../types/user';
import { PRStatus } from '../../types/pr';

export interface NotificationRecipients {
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
  user: User | null;
  notes?: string;
  metadata?: Record<string, any>;
}

export interface StatusTransitionHandler {
  getRecipients(context: NotificationContext): Promise<NotificationRecipients>;
  getEmailContent(context: NotificationContext): Promise<EmailContent>;
  beforeTransition?(context: NotificationContext): Promise<void>;
  afterTransition?(context: NotificationContext): Promise<void>;
}
