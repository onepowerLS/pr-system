import * as functions from 'firebase-functions';
import * as nodemailer from 'nodemailer';
import { db, FieldValue } from './config/firebase';

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

interface NotificationPayload {
    notification: {
        prId: string;
        prNumber: string;
        oldStatus: string;
        newStatus: string;
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
    };
    recipients: string[];
    cc?: string[];
    emailBody: {
        text: string;
        html: string;
    };
    metadata?: {
        prUrl: string;
        requestorEmail: string;
        approverInfo?: {
            id: string;
            email: string;
            name: string;
        };
    };
}

// Function to send PR notification
export const sendPRNotification = functions.https.onCall(async (data: NotificationPayload, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError(
            'unauthenticated',
            'User must be authenticated to send notifications'
        );
    }

    // Validate required fields
    if (!data.notification?.prId || !data.notification?.prNumber || !Array.isArray(data.recipients) || data.recipients.length === 0) {
        throw new functions.https.HttpsError(
            'invalid-argument',
            'The function must be called with valid prId, prNumber, and recipients array.'
        );
    }

    const { notification, recipients, cc = [], emailBody, metadata = {} } = data;

    try {
        // Send email to each recipient
        const emailPromises = recipients.map(recipient =>
            transporter.sendMail({
                from: '"1PWR System" <noreply@1pwrafrica.com>',
                to: recipient,
                cc: cc.filter(email => email !== recipient), // Exclude recipient from CC list
                subject: `New Purchase Request: PR #${notification.prNumber}`,
                text: emailBody.text,
                html: emailBody.html
            })
        );

        await Promise.all(emailPromises);

        // Log successful notification
        await db.collection('notificationLogs').add({
            type: 'STATUS_CHANGE',
            status: 'sent',
            timestamp: FieldValue.serverTimestamp(),
            notification,
            recipients,
            cc,
            metadata
        });

        return { success: true };
    } catch (err) {
        console.error('Error sending notification:', err);
        
        // Log failed notification
        await db.collection('notificationLogs').add({
            type: 'STATUS_CHANGE',
            status: 'failed',
            timestamp: FieldValue.serverTimestamp(),
            notification,
            recipients,
            cc,
            metadata,
            error: err instanceof Error ? err.message : 'Unknown error'
        });

        const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
        throw new functions.https.HttpsError('internal', 'Failed to send notification: ' + errorMessage);
    }
});

export const sendSubmissionEmail = functions.https.onRequest(async (req, res) => {
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        res.status(204).send('');
        return;
    }

    const { email, name, prNumber, oldStatus, newStatus, notes } = req.body;

    if (!email || !name || !prNumber || !oldStatus || !newStatus) {
        res.status(400).json({ error: 'Missing required fields' });
        return;
    }

    try {
        const info = await transporter.sendMail({
            from: '"1PWR System" <noreply@1pwrafrica.com>',
            to: email,
            subject: `PR ${prNumber} Status Changed to ${newStatus}`,
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px;">
                    <h2>Purchase Request Status Change</h2>
                    <p>Dear ${name},</p>
                    <p>The status of PR #${prNumber} has been changed:</p>
                    <ul>
                        <li>From: ${oldStatus}</li>
                        <li>To: ${newStatus}</li>
                    </ul>
                    ${notes ? `<p><strong>Notes:</strong> ${notes}</p>` : ''}
                    <p>Please log in to the system to view more details.</p>
                    <p>Best regards,<br>1PWR System</p>
                </div>
            `
        });

        console.log('Status change email sent:', info.messageId);
        res.status(200).json({ success: true });
    } catch (error) {
        console.error('Error sending email:', error);
        res.status(500).json({ error: 'Failed to send email' });
    }
});
