import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

admin.initializeApp();
const db = admin.firestore();

// Import or define your PR and User types
//import { PRRequest, User } from './types';

interface NotificationPayload {
  prId: string;
  notificationType: 'PR_SUBMITTED' | 'PR_APPROVED' | 'PR_REJECTED' | 'PR_REVISION_REQUESTED' | 'QUOTE_ADDED';
  notes?: string;
}

export const prNotificationHandler = functions.https.onCall(
  async (data: NotificationPayload, context) => {
    try {
      if (!context.auth) {
        throw new functions.https.HttpsError(
          'unauthenticated',
          'Only authenticated users can trigger notifications.'
        );
      }

      const { prId, notificationType, notes } = data;

      // 1. Fetch PR Data
      const prRef = db.collection('pr_requests').doc(prId);
      const prDoc = await prRef.get();

      if (!prDoc.exists) {
        throw new functions.https.HttpsError('not-found', 'PR not found.');
      }

      const pr = prDoc.data() as PRRequest;
      const requestor = (await db.collection('users').doc(pr.requestorId).get()).data() as User;

      // 2. Determine Recipients
      const toRecipients: string[] = [];
      const ccRecipients: string[] = [requestor.email];

      // Add procurement team and approvers based on PR status
      if (notificationType === 'PR_SUBMITTED') {
        // Fetch and add the procurement team emails here
        // toRecipients.push(...procurementTeamEmails);
        // Add the initial approver if needed
        // const initialApprover = ...
        // toRecipients.push(initialApprover.email);
      } else if (notificationType === 'PR_APPROVED' || notificationType === 'PR_REJECTED') {
        const nextApprover = (await db.collection('users').doc(pr.assignedApproverId).get()).data() as User;
        toRecipients.push(nextApprover.email);
      }
      
      // Add more logic here for other notification types as per your spec

      // 3. Create Dynamic Email Content (as per Specifications.md)
      const subject = `PR #${pr.prNumber} - ${notificationType.replace(/_/g, ' ')}`;
      const emailHtml = buildEmailTemplate(pr, notificationType, notes);

      // 4. Send the email using a service like Nodemailer or a transactional email API
      // You would implement the actual email sending logic here
      // e.g., await emailService.sendEmail({ to: toRecipients, cc: ccRecipients, subject, html: emailHtml });
      
      console.log(`Notification sent for PR ${prId}, type: ${notificationType}`);
      
      return { success: true, message: 'Notification triggered successfully.' };
    } catch (error) {
      console.error('Error in notification handler:', error);
      throw new functions.https.HttpsError(
        'internal',
        'Failed to process notification request.'
      );
    }
  }
);

// This function will be a separate implementation as per your specifications for email styling.
function buildEmailTemplate(pr: PRRequest, notificationType: string, notes?: string): string {
  // Implement the logic to generate the full HTML email body here.
  // This will include the styling for urgent/normal PRs,
  // the table for line items, and the action button.
  return `
    <html>
      <body style="font-family: Arial, sans-serif; line-height: 1.6;">
        <div style="background-color: ${pr.isUrgent ? '#ff4444' : '#00C851'}; color: ${pr.isUrgent ? '#fff' : '#000'}; padding: 20px; text-align: center;">
          <h2 style="margin: 0;">${subject}</h2>
        </div>
        <div style="padding: 20px;">
          <p>Dear recipient,</p>
          <p>A new event has occurred for Purchase Request <strong>#${pr.prNumber}</strong>.</p>
          <h4>Details:</h4>
          <ul>
            <li><strong>Description:</strong> ${pr.description}</li>
            <li><strong>Requested by:</strong> ${pr.requestorEmail}</li>
          </ul>
          ${notes ? `<p><strong>Notes:</strong> ${notes}</p>` : ''}
          
          <h4>Line Items:</h4>
          <table border="1" cellpadding="8" style="width: 100%; border-collapse: collapse; border-color: #ddd;">
            <thead>
              <tr style="background-color: #f2f2f2;">
                <th>Item</th>
                <th>Quantity</th>
                <th>UOM</th>
              </tr>
            </thead>
            <tbody>
              ${pr.items.map(item => `
                <tr>
                  <td>${item.description}</td>
                  <td>${item.quantity}</td>
                  <td>${item.uom}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          <div style="text-align: center; margin-top: 30px;">
            <a href="https://your-app-url/pr/${pr.id}" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">View Purchase Request</a>
          </div>
        </div>
      </body>
    </html>
  `;
}