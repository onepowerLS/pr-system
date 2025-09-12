export interface EmailContent {
  subject: string;
  text: string;
  html: string;
  headers?: Record<string, string>;
  content?: string;
}

export interface NotificationUser {
  firstName: string;
  lastName: string;
  email: string;
  name: string;
}

export interface PRRequestor {
  firstName?: string;
  lastName?: string;
  name?: string;
  email?: string;
  department?: string;
}

export interface PR {
  id: string;
  prNumber: string;
  requestor?: PRRequestor;
  site?: string;
  department?: string;
  category?: string;
  projectCategory?: string;
  expenseType?: string;
  estimatedAmount?: number;
  currency?: string;
  preferredVendor?: string;
  requiredDate?: string | Date;
  isUrgent?: boolean;
}

export interface NotificationContext {
  pr: PR;
  prNumber: string;
  user: NotificationUser | null;
  notes?: string;
  baseUrl: string;
  isUrgent: boolean;
}
