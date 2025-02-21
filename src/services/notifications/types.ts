import { User } from '../../types/user';
import { PR, PRStatus } from '../../types/pr';
import { EmailHeaders } from './types/emailHeaders';

export interface Recipients {
  to: string[];
  cc?: string[];
}

export interface EmailContent {
  headers: EmailHeaders;
  subject: string;
  text: string;
  html: string;
  boundary?: string;
}

export interface NotificationContext {
  prId: string;
  pr: PR;
  prNumber: string;
  oldStatus: PRStatus;
  newStatus: PRStatus;
  isUrgent?: boolean;
  user?: {
    email: string;
    firstName?: string;
    lastName?: string;
  };
  notes?: string;
  metadata?: Record<string, any>;
  baseUrl: string;
}

export interface StatusTransitionHandler {
  getRecipients(context: NotificationContext): Promise<Recipients>;
  getEmailContent(context: NotificationContext): Promise<EmailContent>;
  beforeTransition?(context: NotificationContext): Promise<void>;
  afterTransition?(context: NotificationContext): Promise<void>;
}
