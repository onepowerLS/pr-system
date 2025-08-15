import { User } from '../../types/user';
import { PRRequest, PRStatus } from '../../types/pr';
import { EmailHeaders } from './types/emailHeaders';

export interface Recipients {
  to: string[];
  cc?: string[];
}

export interface EmailContent {
  headers?: EmailHeaders;
  subject: string;
  text: string;
  html: string;
  boundary?: string;
  context?: NotificationContext;
}

export interface NotificationContext {
  prId: string;
  pr?: PRRequest;
  prNumber: string;
  oldStatus?: PRStatus;
  newStatus?: PRStatus;
  isUrgent?: boolean;
  user?: {
    id?: string;
    email: string;
    firstName?: string;
    lastName?: string;
    name?: string;
  };
  approver?: {
    id?: string;
    email?: string;
    firstName?: string;
    lastName?: string;
    name?: string;
  };
  requestorInfo?: {
    name: string;
    email: string;
  };
  baseUrl?: string;
  notes?: string;
  metadata?: Record<string, any>;
}

export interface StatusTransitionHandler {
  getRecipients(context: NotificationContext): Promise<Recipients>;
  getEmailContent(context: NotificationContext): Promise<EmailContent>;
  beforeTransition?(context: NotificationContext): Promise<void>;
  afterTransition?(context: NotificationContext): Promise<void>;
}
