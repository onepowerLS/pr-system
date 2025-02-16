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
                        <td style="padding: 8px; border: 1px solid #ddd;"><strong>UOM</strong></td>
                        <td style="padding: 8px; border: 1px solid #ddd;">${item.uom}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px; border: 1px solid #ddd;"><strong>Notes</strong></td>
                        <td style="padding: 8px; border: 1px solid #ddd;">${item.notes || 'N/A'}</td>
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
    const baseUrl = process.env.BASE_URL || 'https://pr.1pwrafrica.com';
    const prUrl = `${baseUrl}/pr/${prData.id}`;
    return `
        <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto;">
            <h2 style="color: #333;">Purchase Request Details</h2>
            ${prData.urgencyLevel ? `
                <div style="display: inline-block; 
                            padding: 4px 8px; 
                            border-radius: 4px; 
                            font-weight: bold;
                            margin-bottom: 15px;
                            background-color: ${prData.urgencyLevel === 'HIGH' ? '#ff4444' :
        prData.urgencyLevel === 'MEDIUM' ? '#ffbb33' :
            '#00C851'};
                            color: ${prData.urgencyLevel === 'LOW' ? '#000' : '#fff'}">
                    ${prData.urgencyLevel} Priority
                </div>` : ''}
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
exports.sendPRNotification = functions.https.onCall(async (data, context) => {
    var _a;
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'The function must be called while authenticated.');
    }
    try {
        const { prData, recipients, cc = [] } = data;
        if (!(prData === null || prData === void 0 ? void 0 : prData.id) || !(prData === null || prData === void 0 ? void 0 : prData.prNumber) || !Array.isArray(recipients) || recipients.length === 0) {
            throw new functions.https.HttpsError('invalid-argument', 'The function must be called with valid prId, prNumber, and recipients array.');
        }
        // Add requestor to CC if not already included
        if (((_a = prData.requestor) === null || _a === void 0 ? void 0 : _a.email) && !cc.includes(prData.requestor.email)) {
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
        // Send email to recipients with CC
        const mailOptions = {
            from: '"1PWR System" <noreply@1pwrafrica.com>',
            to: recipients.join(', '),
            cc: cc.join(', '),
            subject: `New Purchase Request: PR #${prData.prNumber}`,
            html: emailContent
        };
        try {
            const result = await transporter.sendMail(mailOptions);
            console.log('Email sent successfully', result.messageId);
            return { success: true, messageId: result.messageId };
        }
        catch (err) {
            const error = err;
            console.error('Failed to send email:', error);
            throw new functions.https.HttpsError('internal', 'Failed to send email notification', { error: error.message });
        }
    }
    catch (err) {
        const error = err;
        console.error('Error in sendPRNotification:', error);
        throw new functions.https.HttpsError('internal', error.message || 'An unexpected error occurred while sending notifications', { originalError: error });
    }
});
// Function to send status change notification
exports.sendStatusChangeNotification = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated to send notifications');
    }
    const { notification, recipients, cc = [], emailBody } = data;
    try {
        // Send email to each recipient
        const emailPromises = recipients.map((recipient) => transporter.sendMail({
            from: '"1PWR System" <noreply@1pwrafrica.com>',
            to: recipient,
            cc: cc,
            subject: `PR ${notification.prNumber} Status Updated to ${notification.newStatus}`,
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
            cc
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