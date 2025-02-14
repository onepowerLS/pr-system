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
exports.sendStatusChangeNotification = void 0;
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
//# sourceMappingURL=notifications.js.map