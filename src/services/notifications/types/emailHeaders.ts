export interface EmailHeaders {
  'From': string;
  'To': string;
  'Cc'?: string;
  'Subject': string;
  'Message-ID': string;
  'Date': string;
  'MIME-Version': string;
  'Content-Type': string;
  'X-PR-ID'?: string;
  'X-PR-Number'?: string;
  'X-Notification-Type'?: string;
}

export function generateMessageId(prNumber: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  return `<${timestamp}-${random}-${prNumber}@1pwrafrica.com>`;
}

export function generateEmailHeaders(params: {
  prId?: string;
  prNumber: string;
  subject: string;
  notificationType?: string;
}): EmailHeaders {
  const { prId, prNumber, subject, notificationType } = params;
  const now = new Date();
  const domain = '1pwrafrica.com';
  const messageId = generateMessageId(prNumber);

  // Create a simplified set of headers to avoid email client issues
  return {
    'From': `1PWR System <noreply@${domain}>`,
    'To': '', // Will be filled in by the email sending function
    'Subject': subject,
    'Message-ID': messageId,
    'Date': now.toUTCString(),
    'MIME-Version': '1.0',
    'Content-Type': 'multipart/alternative; boundary=""', // Boundary will be set by email service
    'X-PR-ID': prId,
    'X-PR-Number': prNumber,
    'X-Notification-Type': notificationType
  };
}
