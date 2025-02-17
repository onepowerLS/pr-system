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
function getEmailSubject(notification) {
    const { prNumber, oldStatus, newStatus } = notification;
    if (oldStatus === 'SUBMITTED' && newStatus === 'CANCELED') {
        return `PR #${prNumber} Canceled`;
    }
    if (newStatus === 'PENDING_APPROVAL') {
        return `PR #${prNumber} Pending Approval`;
    }
    if (newStatus === 'APPROVED') {
        return `PR #${prNumber} Approved`;
    }
    if (newStatus === 'REJECTED') {
        return `PR #${prNumber} Rejected`;
    }
    if (newStatus === 'REVISION_REQUIRED') {
        return `PR #${prNumber} Revision Required`;
    }
    // Default case for new PRs or other status changes
    return `PR #${prNumber} Status Changed to ${newStatus}`;
}
// Function to send PR notification
exports.sendPRNotification = functions.https.onCall(async (data, context) => {
    var _a, _b;
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated to send notifications');
    }
    // Validate required fields
    if (!((_a = data.notification) === null || _a === void 0 ? void 0 : _a.prId) || !((_b = data.notification) === null || _b === void 0 ? void 0 : _b.prNumber) || !Array.isArray(data.recipients) || data.recipients.length === 0) {
        throw new functions.https.HttpsError('invalid-argument', 'The function must be called with valid prId, prNumber, and recipients array.');
    }
    const { notification, recipients, cc = [], emailBody, metadata = { requestorEmail: '' } } = data;
    try {
        // Send email to each recipient
        const emailPromises = recipients.map(recipient => transporter.sendMail({
            from: '"1PWR System" <noreply@1pwrafrica.com>',
            to: recipient,
            cc: [...cc.filter(email => email !== recipient), metadata.requestorEmail || ''].filter(Boolean), // Include requestor and filter empty strings
            subject: getEmailSubject(notification),
            text: emailBody.text,
            html: emailBody.html
        }));
        await Promise.all(emailPromises);
        // Log successful notification
        await firebase_1.db.collection('notificationLogs').add({
            type: 'STATUS_CHANGE',
            status: 'sent',
            timestamp: firebase_1.FieldValue.serverTimestamp(),
            notification,
            recipients,
            cc,
            metadata
        });
        return { success: true };
    }
    catch (err) {
        console.error('Error sending notification:', err);
        // Log failed notification
        await firebase_1.db.collection('notificationLogs').add({
            type: 'STATUS_CHANGE',
            status: 'failed',
            timestamp: firebase_1.FieldValue.serverTimestamp(),
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