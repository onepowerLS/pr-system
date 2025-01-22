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
exports.updateUserEmail = exports.createUser = exports.syncUserEmails = exports.setupInitialAdmin = exports.setUserClaims = exports.updateUserPassword = exports.testEmailNotification = exports.sendStatusChangeEmail = exports.sendPRNotification = void 0;
const admin = __importStar(require("firebase-admin"));
const functions = __importStar(require("firebase-functions"));
const nodemailer = __importStar(require("nodemailer"));
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
// Initialize Firebase Admin
admin.initializeApp();
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
        var _a;
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
                                          color: #333;
                                          font-size: 12px;">
                                    <svg xmlns="http://www.w3.org/2000/svg" 
                                         width="12" 
                                         height="12" 
                                         viewBox="0 0 24 24" 
                                         fill="none" 
                                         stroke="currentColor" 
                                         stroke-width="2" 
                                         stroke-linecap="round" 
                                         stroke-linejoin="round"
                                         style="margin-right: 4px;">
                                        <path d="M21 15l-9 9h-12v-12l9-9h12v12z"/>
                                    </svg>
                                    View
                                </a>`
                : ''}
                        </span>
                    </li>`).join('')}
               </ul>`
            : 'None';
        return `
        <tr>
            <td>${index + 1}</td>
            <td>${item.description}</td>
            <td>${item.quantity}</td>
            <td>${item.uom}</td>
            <td>${item.notes || '-'}</td>
            <td>${attachmentsList}</td>
        </tr>
    `;
    }).join('');
    return {
        text: `
            Purchase Request ${prData.prNumber}
            
            Department: ${prData.department}
            Requestor: ${prData.requestorName} (${prData.requestorEmail})
            Description: ${prData.description}
            Required Date: ${prData.requiredDate}
            Urgency: ${prData.isUrgent ? 'URGENT' : 'Normal'}
            Date: ${new Date().toLocaleDateString()}
            
            Please review the purchase request in the system.
        `,
        html: `
            <h2>Purchase Request ${prData.prNumber}</h2>
            <p><strong>Department:</strong> ${prData.department}</p>
            <p><strong>Requestor:</strong> ${prData.requestorName} (${prData.requestorEmail})</p>
            <p><strong>Description:</strong> ${prData.description}</p>
            <p><strong>Required Date:</strong> ${prData.requiredDate}</p>
            <p><strong>Urgency:</strong> ${prData.isUrgent ? '<span style="color: red; font-weight: bold;">URGENT</span>' : 'Normal'}</p>
            <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
            
            <h3>Items:</h3>
            <table border="1" cellpadding="5" style="border-collapse: collapse; width: 100%;">
                <tr>
                    <th>#</th>
                    <th>Description</th>
                    <th>Quantity</th>
                    <th>UOM</th>
                    <th>Notes</th>
                    <th>Attachments</th>
                </tr>
                ${items}
            </table>
            
            <p>Please <a href="${process.env.VITE_APP_URL || 'http://localhost:5173'}/pr/${prData.prNumber}">click here</a> to review the purchase request in the system.</p>
        `
    };
};
// Function to send PR notification
exports.sendPRNotification = functions.https.onCall(async (data, context) => {
    var _a;
    try {
        if (!data.requestorEmail) {
            throw new Error('Requestor email is required');
        }
        console.log('Received notification data:', data);
        console.log('Items with attachments:', (_a = data.items) === null || _a === void 0 ? void 0 : _a.map((item) => ({
            description: item.description,
            attachments: item.attachments
        })));
        const emailContent = generatePREmailContent(data);
        console.log('Generated email content:', emailContent);
        // Create email subject based on urgency
        const subject = data.isUrgent
            ? `URGENT: Purchase Request - ${data.prNumber}`
            : `Purchase Request - ${data.prNumber}`;
        // Send to procurement and CC the requestor
        const procurementInfo = await transporter.sendMail({
            from: '"1PWR PR System" <noreply@1pwrafrica.com>',
            to: 'procurement@1pwrafrica.com',
            cc: data.requestorEmail,
            subject: subject,
            text: emailContent.text,
            html: emailContent.html
        });
        console.log('PR notification sent:', procurementInfo.messageId);
        return {
            success: true,
            messageId: procurementInfo.messageId
        };
    }
    catch (error) {
        console.error('Error sending PR notification:', error);
        throw new functions.https.HttpsError('internal', 'Failed to send PR notification');
    }
});
// Function to send status change notification
exports.sendStatusChangeEmail = functions.https.onCall(async (data, context) => {
    try {
        const { notification, recipients } = data;
        const { prId, prNumber, oldStatus, newStatus, changedBy, notes } = notification;
        // Create email content
        const emailContent = {
            text: `
                PR Status Change Notification - ${prNumber}
                
                Status Changed: ${oldStatus} → ${newStatus}
                Changed By: ${changedBy.email}
                Date: ${new Date().toLocaleDateString()}
                ${notes ? `\nNotes: ${notes}` : ''}
                
                Please review the purchase request in the system.
            `,
            html: `
                <h2>PR Status Change Notification - ${prNumber}</h2>
                <p><strong>Status Changed:</strong> ${oldStatus} → ${newStatus}</p>
                <p><strong>Changed By:</strong> ${changedBy.email}</p>
                <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
                ${notes ? `<p><strong>Notes:</strong> ${notes}</p>` : ''}
                
                <p>Please <a href="${process.env.VITE_APP_URL || 'http://localhost:5173'}/pr/${prId}">click here</a> to review the purchase request in the system.</p>
            `
        };
        // Send email
        const info = await transporter.sendMail({
            from: '"1PWR PR System" <noreply@1pwrafrica.com>',
            to: recipients.join(', '),
            subject: `PR Status Change - ${prNumber}: ${oldStatus} → ${newStatus}`,
            text: emailContent.text,
            html: emailContent.html
        });
        console.log('Status change notification sent:', info.messageId);
        return {
            success: true,
            messageId: info.messageId
        };
    }
    catch (error) {
        console.error('Error sending status change notification:', error);
        throw new functions.https.HttpsError('internal', 'Failed to send status change notification');
    }
});
// Test email function
exports.testEmailNotification = functions.https.onCall(async (data, context) => {
    try {
        const testInfo = await transporter.sendMail({
            from: '"1PWR PR System" <noreply@1pwrafrica.com>',
            to: data.email,
            subject: 'Test Email from PR System',
            text: `This is a test email sent at ${new Date().toISOString()}`,
            html: `<p>This is a test email sent at ${new Date().toISOString()}</p>`
        });
        console.log('Test email sent:', testInfo.messageId);
        return {
            success: true,
            messageId: testInfo.messageId
        };
    }
    catch (error) {
        console.error('Error sending test email:', error);
        throw new functions.https.HttpsError('internal', 'Failed to send test email');
    }
});
//# sourceMappingURL=index.js.map