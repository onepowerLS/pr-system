import * as functions from 'firebase-functions';
import * as nodemailer from 'nodemailer';
import { db, FieldValue } from './config/firebase';
import { updateUserPassword } from './updateUserPassword';
import { setUserClaims } from './setUserClaims';
import { setupInitialAdmin } from './setupInitialAdmin';
import { syncUserEmails } from './syncUserEmails';
import { createUser } from './createUser';
import { updateUserEmail } from './updateUserEmail';

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

// Helper function to format file size
const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

// Helper function to generate PR email content
const generatePREmailContent = (prData: any) => {
    const items = prData.items.map((item: any, index: number) => {
        const attachmentsList = item.attachments?.length > 0
            ? `<ul style="margin: 0; padding-left: 20px;">
                ${item.attachments.map((att: any) => 
                    `<li style="margin-bottom: 4px;">
                        <span style="display: inline-flex; align-items: center;">
                            ${att.name} (${formatFileSize(att.size)})
                            ${att.url ? `
                                <a href="${att.url}" 
                                   target="_blank"
                                   style="margin-left: 8px; 
                                          display: inline-flex;
                                          align-items: center;
                                          padding: 2px 6px;
                                          background: #f0f0f0;
                                          border: 1px solid #ddd;
                                          border-radius: 4px;
                                          text-decoration: none;
                                          color: #333;">
                                    View
                                </a>
                            ` : ''}
                        </span>
                    </li>`
                ).join('')}
            </ul>`
            : '';

        return `
            <div style="margin-bottom: 20px;">
                <h3 style="margin: 0 0 10px 0;">Item ${index + 1}</h3>
                <table style="border-collapse: collapse; width: 100%;">
                    <tr>
                        <td style="padding: 8px; border: 1px solid #ddd; width: 150px;"><strong>Description</strong></td>
                        <td style="padding: 8px; border: 1px solid #ddd;">${item.description}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px; border: 1px solid #ddd;"><strong>Quantity</strong></td>
                        <td style="padding: 8px; border: 1px solid #ddd;">${item.quantity}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px; border: 1px solid #ddd;"><strong>UOM</strong></td>
                        <td style="padding: 8px; border: 1px solid #ddd;">${item.uom}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px; border: 1px solid #ddd;"><strong>Notes</strong></td>
                        <td style="padding: 8px; border: 1px solid #ddd;">${item.notes || 'N/A'}</td>
                    </tr>
                    ${item.attachments?.length > 0 ? `
                        <tr>
                            <td style="padding: 8px; border: 1px solid #ddd;"><strong>Attachments</strong></td>
                            <td style="padding: 8px; border: 1px solid #ddd;">${attachmentsList}</td>
                        </tr>
                    ` : ''}
                </table>
            </div>
        `;
    }).join('');

    const baseUrl = process.env.BASE_URL || 'https://pr.1pwrafrica.com';
    const prUrl = `${baseUrl}/pr/${prData.id}`;

    return `
        <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto;">
            <h2 style="color: #333;">Purchase Request Details</h2>
            ${prData.urgencyLevel ? `
                <div style="display: inline-block; 
                            padding: 8px 16px; 
                            border-radius: 4px; 
                            font-weight: bold;
                            margin-bottom: 20px;
                            background-color: ${
                                prData.urgencyLevel === 'HIGH' ? '#ff4444' :
                                prData.urgencyLevel === 'MEDIUM' ? '#ffbb33' :
                                '#00C851'
                            };
                            color: ${prData.urgencyLevel === 'NORMAL' ? '#000' : '#fff'}">
                    ${prData.urgencyLevel} PRIORITY
                </div>
            ` : ''}
            <table style="border-collapse: collapse; width: 100%; margin-bottom: 30px;">
                <tr>
                    <td style="padding: 8px; border: 1px solid #ddd; width: 150px;"><strong>PR Number</strong></td>
                    <td style="padding: 8px; border: 1px solid #ddd;">${prData.prNumber}</td>
                </tr>
                <tr>
                    <td style="padding: 8px; border: 1px solid #ddd;"><strong>Description</strong></td>
                    <td style="padding: 8px; border: 1px solid #ddd;">${prData.description || 'N/A'}</td>
                </tr>
                <tr>
                    <td style="padding: 8px; border: 1px solid #ddd;"><strong>Department</strong></td>
                    <td style="padding: 8px; border: 1px solid #ddd;">${prData.department}</td>
                </tr>
                <tr>
                    <td style="padding: 8px; border: 1px solid #ddd;"><strong>Required Date</strong></td>
                    <td style="padding: 8px; border: 1px solid #ddd;">${prData.requiredDate}</td>
                </tr>
                <tr>
                    <td style="padding: 8px; border: 1px solid #ddd;"><strong>Estimated Amount</strong></td>
                    <td style="padding: 8px; border: 1px solid #ddd;">${prData.currency} ${prData.estimatedAmount || 0}</td>
                </tr>
                <tr>
                    <td style="padding: 8px; border: 1px solid #ddd;"><strong>Requestor</strong></td>
                    <td style="padding: 8px; border: 1px solid #ddd;">${prData.requestor || prData.requestorEmail || 'N/A'}</td>
                </tr>
            </table>
            <div style="margin-bottom: 20px;">
                <a href="${prUrl}" 
                   target="_blank"
                   style="display: inline-block;
                          padding: 10px 20px;
                          background-color: #4CAF50;
                          color: white;
                          text-decoration: none;
                          border-radius: 4px;
                          margin-bottom: 20px;">
                    View Purchase Request
                </a>
            </div>
            <h3 style="color: #333;">Items</h3>
            ${items}
        </div>
    `;
};

// Function to send PR notification
export const sendPRNotification = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError(
            'unauthenticated',
            'The function must be called while authenticated.'
        );
    }

    try {
        const { prData, recipients, cc = [] } = data;

        if (!prData?.id || !prData?.prNumber || !Array.isArray(recipients) || recipients.length === 0) {
            throw new functions.https.HttpsError(
                'invalid-argument',
                'The function must be called with valid prId, prNumber, and recipients array.'
            );
        }

        // Add requestor to CC if not already included
        if (prData.requestor?.email && !cc.includes(prData.requestor.email)) {
            cc.push(prData.requestor.email);
        }

        // Log the incoming data for debugging
        console.log('Received PR notification request:', {
            prId: prData.id,
            prNumber: prData.prNumber,
            recipientCount: recipients.length,
            ccCount: cc.length,
            userId: context.auth.uid
        });

        const emailContent = generatePREmailContent(prData);

        // Prepare email subject with urgency if HIGH
        const emailSubject = prData.urgencyLevel === 'HIGH' 
            ? `URGENT: Purchase Request #${prData.prNumber}`
            : `Purchase Request #${prData.prNumber}`;

        // Send email to recipients with CC
        const mailOptions = {
            from: '"1PWR System" <noreply@1pwrafrica.com>',
            to: recipients.join(', '),
            cc: cc.join(', '),
            subject: emailSubject,
            html: emailContent
        };

        try {
            const result = await transporter.sendMail(mailOptions);
            console.log('Email sent successfully', result.messageId);
            return { success: true, messageId: result.messageId };
        } catch (err) {
            const error = err as Error;
            console.error('Failed to send email:', error);
            throw new functions.https.HttpsError(
                'internal',
                'Failed to send email notification',
                { error: error.message }
            );
        }
    } catch (err) {
        const error = err as Error;
        console.error('Error in sendPRNotification:', error);
        throw new functions.https.HttpsError(
            'internal',
            error.message || 'An unexpected error occurred while sending notifications',
            { originalError: error }
        );
    }
});

interface StatusChangeNotification {
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
}

interface NotificationPayload {
    notification: StatusChangeNotification;
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

// Function to send status change notification
export const sendStatusChangeNotification = functions.https.onCall(async (data: NotificationPayload, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError(
            'unauthenticated',
            'User must be authenticated to send notifications'
        );
    }

    const { notification, recipients, cc = [], emailBody } = data;

    try {
        // Send email to each recipient
        const emailPromises = recipients.map((recipient: string) =>
            transporter.sendMail({
                from: '"1PWR System" <noreply@1pwrafrica.com>',
                to: recipient,
                cc: cc,
                subject: `PR ${notification.prNumber} Status Updated to ${notification.newStatus}`,
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
            cc
        });

        return { success: true };
    } catch (error) {
        console.error('Error sending notification:', error);
        throw new functions.https.HttpsError('internal', 'Failed to send notification');
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

export {
    updateUserPassword,
    setUserClaims,
    setupInitialAdmin,
    syncUserEmails,
    createUser,
    updateUserEmail
};
