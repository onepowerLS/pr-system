import { User } from './user';
import { PRStatus } from './pr';

export type NotificationType = 
  | 'STATUS_CHANGE'
  | 'PR_SUBMITTED'
  | 'PR_APPROVED'
  | 'PR_REJECTED'
  | 'COMMENT_ADDED'
  | 'URGENT_PR'
  | 'REMINDER'
  | 'CANCELLATION_WARNING'
  | 'CUSTOMS_WARNING';

export interface NotificationLog {
  id: string;
  type: NotificationType;
  prId: string;
  recipients: string[];
  sentAt: Date;
  status: 'pending' | 'sent' | 'failed';
  error?: string;
}

export interface EmailContent {
  subject: string;
  text: string;
  html: string;
  headers?: Record<string, string>;
}

export interface Notification {
  id: string;
  type: string;
  prId: string;
  prNumber: string;
  oldStatus?: PRStatus;
  newStatus?: PRStatus;
  timestamp: string;
  user: User | string;
  notes: string;
  emailContent: EmailContent;
  recipients?: string[];
  cc?: string[];
}

export interface NotificationContext {
  pr: any;
  prNumber: string;
  user: User | null;
  notes?: string;
  baseUrl: string;
  isUrgent: boolean;
}

export interface StatusChangeNotification {
  type: 'STATUS_CHANGE';
  prId: string;
  prNumber: string;
  description: string;
  oldStatus: string;
  newStatus: string;
  changedBy: User;
  timestamp: Date;
  notes?: string;
}

export interface NotificationTemplate {
  subject: string;
  body: string;
}
