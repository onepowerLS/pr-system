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
            isUrgent?: boolean;
        };
    };
    recipients: string[];
    cc?: string[];
    emailBody: {
        subject?: string;
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

// Helper function to generate appropriate email subject
function getEmailSubject(notification: NotificationPayload['notification'], emailBody: NotificationPayload['emailBody']): string {
    // If a subject is provided in the emailBody, use that
    if (emailBody.subject) {
        return emailBody.subject;
    }

    const { prNumber, oldStatus, newStatus, metadata } = notification;
    const isUrgent = metadata?.isUrgent || false;
    const urgentPrefix = isUrgent ? 'URGENT: ' : '';
    
    // New PR submission
    if (oldStatus === '' && newStatus === 'SUBMITTED') {
        return `${urgentPrefix}New Purchase Request: PR #${prNumber}`;
    }
    
    // Status changes
    return `${urgentPrefix}${newStatus}: PR #${prNumber}`;
}

// Function to send PR notification
export const sendPRNotification = functions.https.onCall(async (data: NotificationPayload, context) => {
    console.log('Starting sendPRNotification with data:', JSON.stringify(data, null, 2));

    if (!context.auth) {
        console.error('Authentication missing');
        throw new functions.https.HttpsError(
            'unauthenticated',
            'User must be authenticated to send notifications'
        );
    }

    // Validate required fields
    if (!data.notification?.prId || !data.notification?.prNumber || !Array.isArray(data.recipients) || data.recipients.length === 0) {
        console.error('Invalid arguments:', { 
            prId: data.notification?.prId,
            prNumber: data.notification?.prNumber,
            recipients: data.recipients
        });
        throw new functions.https.HttpsError(
            'invalid-argument',
            'The function must be called with valid prId, prNumber, and recipients array.'
        );
    }

    const { notification, recipients, cc = [], emailBody, metadata = { requestorEmail: '' } } = data;
    console.log('Preparing to send emails to:', { recipients, cc });

    try {
        // Send email to each recipient
        const emailPromises = recipients.map(async recipient => {
            console.log('Sending email to:', recipient);
            const mailOptions = {
                from: '"1PWR System" <noreply@1pwrafrica.com>',
                to: recipient,
                cc: cc.filter(email => email !== recipient).filter(Boolean),
                subject: getEmailSubject(notification, emailBody),
                text: emailBody.text,
                html: emailBody.html
            };
            console.log('Mail options:', JSON.stringify(mailOptions, null, 2));
            
            try {
                const result = await transporter.sendMail(mailOptions);
                console.log('Email sent successfully to:', recipient, 'Result:', result);
                return result;
            } catch (error) {
                console.error('Failed to send email to:', recipient, 'Error:', error);
                throw error;
            }
        });

        // Wait for all emails to be sent
        const results = await Promise.all(emailPromises);
        console.log('All emails sent successfully:', results);

        // Log successful notification
        const logData = {
            type: 'STATUS_CHANGE',
            status: 'sent',
            timestamp: FieldValue.serverTimestamp(),
            notification,
            recipients,
            cc,
            emailBody,
            metadata
        };
        console.log('Logging notification:', logData);
        
        await db.collection('notificationLogs').add(logData);
        console.log('Notification logged successfully');

        return { success: true };
    } catch (error) {
        console.error('Error in sendPRNotification:', error);
        throw new functions.https.HttpsError(
            'internal',
            'Failed to send notification: ' + (error instanceof Error ? error.message : String(error))
        );
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
