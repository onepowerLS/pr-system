import * as functions from 'firebase-functions';
import * as nodemailer from 'nodemailer';
import { db, FieldValue } from './config/firebase';

interface NotificationPayload {
    notification: StatusChangeNotification;
    recipients: string[];
}

interface StatusChangeNotification {
    type: 'STATUS_CHANGE';
    prId: string;
    prNumber: string;
    oldStatus: string;
    newStatus: string;
    timestamp: string;
    user: {
        email: string;
        name: string;
    };
    notes: string;
    metadata: {
        description: string;
        amount: number;
        currency: string;
        department: string;
        requiredDate: string;
    };
}

// Create transporter
const transporter = nodemailer.createTransport({
    host: 'mail.1pwrafrica.com',
    port: 587,
    secure: false,
    auth: {
        user: 'noreply@1pwrafrica.com',
        pass: '1PWR00'
    },
    tls: {
        rejectUnauthorized: false
    }
});

// Function to send status change notification
export const sendStatusChangeNotification = functions.https.onCall(async (data: NotificationPayload, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError(
            'unauthenticated',
            'User must be authenticated to send notifications'
        );
    }

    const { notification, recipients } = data;

    try {
        // Get email template based on status change
        const template = {
            subject: `PR ${notification.prNumber} Status Updated to ${notification.newStatus}`,
            html: `
                <h2>PR Status Change Notification</h2>
                <p>PR #${notification.prNumber} has been updated:</p>
                <ul>
                    <li>From: ${notification.oldStatus}</li>
                    <li>To: ${notification.newStatus}</li>
                    <li>By: ${notification.user.name} (${notification.user.email})</li>
                    <li>Notes: ${notification.notes || 'No notes provided'}</li>
                </ul>
                <h3>PR Details:</h3>
                <ul>
                    <li>Description: ${notification.metadata.description}</li>
                    <li>Amount: ${notification.metadata.currency} ${notification.metadata.amount}</li>
                    <li>Department: ${notification.metadata.department}</li>
                    <li>Required Date: ${notification.metadata.requiredDate}</li>
                </ul>
                <p>Please log in to the system to view more details.</p>
            `
        };

        // Send email to each recipient
        const emailPromises = recipients.map((recipient: string) =>
            transporter.sendMail({
                from: '"1PWR System" <noreply@1pwrafrica.com>',
                to: recipient,
                subject: template.subject,
                html: template.html
            })
        );

        await Promise.all(emailPromises);

        // Log successful notification
        await db.collection('notificationLogs').add({
            type: 'STATUS_CHANGE',
            status: 'sent',
            timestamp: FieldValue.serverTimestamp(),
            notification,
            recipients
        });

        return { success: true };
    } catch (error) {
        console.error('Error sending notification:', error);
        throw new functions.https.HttpsError('internal', 'Failed to send notification');
    }
});
