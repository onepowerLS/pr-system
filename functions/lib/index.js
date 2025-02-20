"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendSubmissionEmail = exports.sendPRNotification = void 0;
const functions = __importStar(require("firebase-functions"));
const nodemailer = __importStar(require("nodemailer"));
const firebase_1 = require("./config/firebase");
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
// Helper function to generate appropriate email subject
function getEmailSubject(notification, emailBody) {
    // If a subject is provided in the emailBody, use that
    if (emailBody.subject) {
        return emailBody.subject;
    }
    const { prNumber, oldStatus, newStatus, metadata } = notification;
    const isUrgent = (metadata === null || metadata === void 0 ? void 0 : metadata.isUrgent) || false;
    const urgentPrefix = isUrgent ? 'URGENT: ' : '';
    // New PR submission
    if (oldStatus === '' && newStatus === 'SUBMITTED') {
        return `${urgentPrefix}New Purchase Request: PR #${prNumber}`;
    }
    // Status changes
    return `${urgentPrefix}${newStatus}: PR #${prNumber}`;
}
// Function to send PR notification
exports.sendPRNotification = functions.https.onCall(async (data, context) => {
    var _a, _b, _c, _d;
    console.log('Starting sendPRNotification with data:', JSON.stringify(data, null, 2));
    if (!context.auth) {
        console.error('Authentication missing');
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated to send notifications');
    }
    // Validate required fields
    if (!((_a = data.notification) === null || _a === void 0 ? void 0 : _a.prId) || !((_b = data.notification) === null || _b === void 0 ? void 0 : _b.prNumber) || !Array.isArray(data.recipients) || data.recipients.length === 0) {
        console.error('Invalid arguments:', {
            prId: (_c = data.notification) === null || _c === void 0 ? void 0 : _c.prId,
            prNumber: (_d = data.notification) === null || _d === void 0 ? void 0 : _d.prNumber,
            recipients: data.recipients
        });
        throw new functions.https.HttpsError('invalid-argument', 'The function must be called with valid prId, prNumber, and recipients array.');
    }
    const { notification, recipients, cc = [], emailBody, metadata = { requestorEmail: '' } } = data;
    console.log('Preparing to send emails to:', { recipients, cc });
    try {
        // Send email to each recipient
        const emailPromises = recipients.map(async (recipient) => {
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
            }
            catch (error) {
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
            timestamp: firebase_1.FieldValue.serverTimestamp(),
            notification,
            recipients,
            cc,
            emailBody,
            metadata
        };
        console.log('Logging notification:', logData);
        await firebase_1.db.collection('notificationLogs').add(logData);
        console.log('Notification logged successfully');
        return { success: true };
    }
    catch (error) {
        console.error('Error in sendPRNotification:', error);
        throw new functions.https.HttpsError('internal', 'Failed to send notification: ' + (error instanceof Error ? error.message : String(error)));
    }
});
exports.sendSubmissionEmail = functions.https.onRequest(async (req, res) => {
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
    }
    catch (error) {
        console.error('Error sending email:', error);
        res.status(500).json({ error: 'Failed to send email' });
    }
});
//# sourceMappingURL=index.js.map