export interface EmailHeaders {
  'Return-Path': string;
  'Delivered-To': string;
  'Received': string[];
  'Return-path': string;
  'Envelope-to': string;
  'Delivery-date': string;
  'Precedence': string;
  'X-Auto-Response-Suppress': string;
  'Auto-Submitted': string;
  'From': string;
  'To': string;
  'Cc'?: string;
  'Subject': string;
  'Message-ID': string;
  'Date': string;
  'MIME-Version': string;
  'Content-Type': string;
  'X-BeenThere': string;
  'X-Mailman-Version': string;
  'List-Id': string;
  'List-Unsubscribe': string[];
  'List-Post': string;
  'List-Help': string;
  'List-Subscribe': string[];
  'Errors-To': string;
  'Sender': string;
}

export function generateMessageId(prNumber: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  return `<${timestamp}-${random}-${prNumber}@1pwrafrica.com>`;
}

export function generateEmailHeaders(params: {
  to: string;
  cc?: string[];
  subject: string;
  prNumber: string;
  isHtml?: boolean;
}): EmailHeaders {
  const { to, cc, subject, prNumber, isHtml = true } = params;
  const now = new Date();
  const boundary = `--_NmP-${Math.random().toString(36).substring(2)}`;
  const listAddress = 'procurement@1pwrafrica.com';
  const domain = '1pwrafrica.com';
  const messageId = generateMessageId(prNumber);

  return {
    'Return-Path': `<procurement-bounces@${domain}>`,
    'Delivered-To': to,
    'Received': [
      `from ded4738.inmotionhosting.com with LMTP id iGE0CrlnuGcMNwAAR/gerA (envelope-from <procurement-bounces@${domain}>)`
    ],
    'Return-path': `<procurement-bounces@${domain}>`,
    'Envelope-to': to,
    'Delivery-date': now.toUTCString(),
    'Precedence': 'bulk',
    'X-Auto-Response-Suppress': 'All',
    'Auto-Submitted': 'auto-generated',
    'From': `1PWR System <noreply@${domain}>`,
    'To': to,
    'Cc': cc?.join(', '),
    'Subject': subject,
    'Message-ID': messageId,
    'Date': now.toUTCString(),
    'MIME-Version': '1.0',
    'Content-Type': isHtml 
      ? `multipart/alternative; boundary="${boundary}"`
      : 'text/plain; charset=utf-8',
    'X-BeenThere': listAddress,
    'X-Mailman-Version': '2.1.39',
    'List-Id': `<procurement.${domain}>`,
    'List-Unsubscribe': [
      `<http://${domain}/mailman/options/procurement_${domain}>`,
      `<mailto:procurement-request@${domain}?subject=unsubscribe>`
    ],
    'List-Post': `<mailto:${listAddress}>`,
    'List-Help': `<mailto:procurement-request@${domain}?subject=help>`,
    'List-Subscribe': [
      `<http://${domain}/mailman/listinfo/procurement_${domain}>`,
      `<mailto:procurement-request@${domain}?subject=subscribe>`
    ],
    'Errors-To': `procurement-bounces@${domain}`,
    'Sender': `"Procurement" <procurement-bounces@${domain}>`
  };
}
