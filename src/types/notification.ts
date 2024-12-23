import { User } from './user';
import { PRStatus } from './pr';

export interface NotificationLog {
  id: string;
  type: NotificationType;
  prId: string;
  recipients: string[];
  sentAt: Date;
  status: 'pending' | 'sent' | 'failed';
  error?: string;
}

export enum NotificationType {
  STATUS_CHANGE = 'STATUS_CHANGE',
  REMINDER = 'REMINDER',
  CANCELLATION_WARNING = 'CANCELLATION_WARNING',
  CUSTOMS_WARNING = 'CUSTOMS_WARNING'
}

export interface StatusChangeNotification {
  prId: string;
  oldStatus: PRStatus;
  newStatus: PRStatus;
  changedBy: User;
  timestamp: Date;
  notes?: string;
}

export interface NotificationTemplate {
  subject: string;
  body: string;
}
