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
exports.updateUserEmail = exports.createUser = exports.syncUserEmails = exports.setupInitialAdmin = exports.setUserClaims = exports.updateUserPassword = exports.sendSubmissionEmail = exports.sendStatusChangeNotification = exports.sendPRNotification = void 0;
const functions = __importStar(require("firebase-functions"));
const nodemailer = __importStar(require("nodemailer"));
const firebase_1 = require("./config/firebase");
const updateUserPassword_1 = require("./updateUserPassword");
Object.defineProperty(exports, "updateUserPassword", { enumerable: true, get: function () { return updateUserPassword_1.updateUserPassword; } });
const setUserClaims_1 = require("./setUserClaims");
Object.defineProperty(exports, "setUserClaims", { enumerable: true, get: function () { return setUserClaims_1.setUserClaims; } });
const setupInitialAdmin_1 = require("./setupInitialAdmin");
Object.defineProperty(exports, "setupInitialAdmin", { enumerable: true, get: function () { return setupInitialAdmin_1.setupInitialAdmin; } });
const syncUserEmails_1 = require("./syncUserEmails");
Object.defineProperty(exports, "syncUserEmails", { enumerable: true, get: function () { return syncUserEmails_1.syncUserEmails; } });
const createUser_1 = require("./createUser");
Object.defineProperty(exports, "createUser", { enumerable: true, get: function () { return createUser_1.createUser; } });
const updateUserEmail_1 = require("./updateUserEmail");
Object.defineProperty(exports, "updateUserEmail", { enumerable: true, get: function () { return updateUserEmail_1.updateUserEmail; } });
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
const formatFileSize = (bytes) => {
    if (bytes < 1024)
        return `${bytes} B`;
    if (bytes < 1024 * 1024)
        return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};
// Helper function to generate PR email content
const generatePREmailContent = (prData) => {
    const items = prData.items.map((item, index) => {
        var _a, _b;
        const attachmentsList = ((_a = item.attachments) === null || _a === void 0 ? void 0 : _a.length) > 0
            ? `<ul style="margin: 0; padding-left: 20px;">
                ${item.attachments.map((att) => `<li style="margin-bottom: 4px;">
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
                    </li>`).join('')}
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
                        <td style="padding: 8px; border: 1px solid #ddd;"><strong>Unit Price</strong></td>
                        <td style="padding: 8px; border: 1px solid #ddd;">${item.unitPrice}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px; border: 1px solid #ddd;"><strong>Total</strong></td>
                        <td style="padding: 8px; border: 1px solid #ddd;">${item.quantity * item.unitPrice}</td>
                    </tr>
                    ${((_b = item.attachments) === null || _b === void 0 ? void 0 : _b.length) > 0 ? `
                        <tr>
                            <td style="padding: 8px; border: 1px solid #ddd;"><strong>Attachments</strong></td>
                            <td style="padding: 8px; border: 1px solid #ddd;">${attachmentsList}</td>
                        </tr>
                    ` : ''}
                </table>
            </div>
        `;
    }).join('');
    return `
        <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto;">
            <h2 style="color: #333;">Purchase Request Details</h2>
            <table style="border-collapse: collapse; width: 100%; margin-bottom: 30px;">
                <tr>
                    <td style="padding: 8px; border: 1px solid #ddd; width: 150px;"><strong>PR Number</strong></td>
                    <td style="padding: 8px; border: 1px solid #ddd;">${prData.prNumber}</td>
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
                    <td style="padding: 8px; border: 1px solid #ddd;"><strong>Total Amount</strong></td>
                    <td style="padding: 8px; border: 1px solid #ddd;">${prData.currency} ${prData.totalAmount}</td>
                </tr>
            </table>
            <h3 style="color: #333;">Items</h3>
            ${items}
        </div>
    `;
};
// Function to send PR notification
exports.sendPRNotification = functions.https.onRequest(async (req, res) => {
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        res.set('Access-Control-Allow-Origin', '*');
        res.set('Access-Control-Allow-Methods', 'GET, POST');
        res.set('Access-Control-Allow-Headers', 'Content-Type');
        res.status(204).send('');
        return;
    }
    // Set CORS headers for the main request
    res.set('Access-Control-Allow-Origin', '*');
    try {
        const { prData, recipients } = req.body;
        if (!prData || !recipients || !Array.isArray(recipients)) {
            res.status(400).json({ error: 'Invalid request data' });
            return;
        }
        const emailContent = generatePREmailContent(prData);
        // Send email to each recipient
        const emailPromises = recipients.map(recipient => transporter.sendMail({
            from: '"1PWR System" <noreply@1pwrafrica.com>',
            to: recipient,
            subject: `New Purchase Request: PR #${prData.prNumber}`,
            html: emailContent
        }));
        await Promise.all(emailPromises);
        // Log successful notification
        await firebase_1.db.collection('notificationLogs').add({
            type: 'PR_SUBMISSION',
            status: 'sent',
            timestamp: firebase_1.FieldValue.serverTimestamp(),
            prId: prData.id,
            prNumber: prData.prNumber,
            recipients
        });
        res.status(200).json({ success: true });
    }
    catch (error) {
        console.error('Error sending PR notification:', error);
        res.status(500).json({ error: 'Failed to send notification' });
    }
});
// Function to send status change notification
exports.sendStatusChangeNotification = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated to send notifications');
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
        const emailPromises = recipients.map((recipient) => transporter.sendMail({
            from: '"1PWR System" <noreply@1pwrafrica.com>',
            to: recipient,
            subject: template.subject,
            html: template.html
        }));
        await Promise.all(emailPromises);
        // Log successful notification
        await firebase_1.db.collection('notificationLogs').add({
            type: 'STATUS_CHANGE',
            status: 'sent',
            timestamp: firebase_1.FieldValue.serverTimestamp(),
            notification,
            recipients
        });
        return { success: true };
    }
    catch (error) {
        console.error('Error sending notification:', error);
        throw new functions.https.HttpsError('internal', 'Failed to send notification');
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