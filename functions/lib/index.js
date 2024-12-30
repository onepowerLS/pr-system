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
exports.testEmailNotification = exports.sendPRNotification = void 0;
const admin = __importStar(require("firebase-admin"));
const functions = __importStar(require("firebase-functions"));
const nodemailer = __importStar(require("nodemailer"));
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
// Helper function to generate PR email content
const generatePREmailContent = (prData) => {
    const items = prData.items.map((item, index) => `
        <tr>
            <td>${index + 1}</td>
            <td>${item.description}</td>
            <td>${item.quantity}</td>
            <td>${item.uom}</td>
            <td>${item.notes || '-'}</td>
        </tr>
    `).join('');
    return {
        text: `
            New Purchase Request Submitted
            
            PR Number: ${prData.prNumber}
            Department: ${prData.department}
            Requestor: ${prData.requestorName} (${prData.requestorEmail})
            Description: ${prData.description}
            Date: ${new Date().toLocaleDateString()}
            
            Please review the purchase request in the system.
        `,
        html: `
            <h2>New Purchase Request Submitted</h2>
            <p><strong>PR Number:</strong> ${prData.prNumber}</p>
            <p><strong>Department:</strong> ${prData.department}</p>
            <p><strong>Requestor:</strong> ${prData.requestorName} (${prData.requestorEmail})</p>
            <p><strong>Description:</strong> ${prData.description}</p>
            <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
            
            <h3>Items:</h3>
            <table border="1" cellpadding="5" style="border-collapse: collapse; width: 100%;">
                <tr>
                    <th>#</th>
                    <th>Description</th>
                    <th>Quantity</th>
                    <th>UOM</th>
                    <th>Notes</th>
                </tr>
                ${items}
            </table>
            
            <p>Please <a href="http://localhost:5173/pr/${prData.prNumber}">click here</a> to review the purchase request in the system.</p>
        `
    };
};
// Function to send PR notification
exports.sendPRNotification = functions.https.onCall(async (data, context) => {
    try {
        if (!data.requestorEmail) {
            throw new Error('Requestor email is required');
        }
        const emailContent = generatePREmailContent(data);
        // Send to procurement and CC the requestor
        const procurementInfo = await transporter.sendMail({
            from: '"1PWR PR System" <noreply@1pwrafrica.com>',
            to: 'procurement@1pwrafrica.com',
            cc: data.requestorEmail,
            subject: `New Purchase Request - PR#${data.prNumber}`,
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