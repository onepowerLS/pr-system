export interface EmailContent {
  subject: string;
  text: string;
  html: string;
}

export interface NotificationUser {
  firstName: string;
  lastName: string;
  email: string;
  name: string;
}

export interface NotificationContext {
  pr: any;  // TODO: Define proper PR type
  prNumber: string;
  user: NotificationUser | null;
  notes?: string;
  baseUrl: string;
  isUrgent: boolean;
}
