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
const admin = __importStar(require("firebase-admin"));
const pr_1 = require("../../src/types/pr");
exports.sendStatusChangeNotification = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated to send notifications');
    }
    const { notification, recipients } = data;
    try {
        // Get email template based on status change
        const template = getEmailTemplate(notification);
        // Send email to each recipient
        const emailPromises = recipients.map(recipient => admin.firestore().collection('mail').add({
            to: recipient,
            template: {
                name: template.name,
                data: Object.assign(Object.assign({}, template.data), { recipientEmail: recipient })
            }
        }));
        await Promise.all(emailPromises);
        // Log successful notification
        await admin.firestore().collection('notificationLogs').add({
            type: 'STATUS_CHANGE',
            status: 'sent',
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
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
function getEmailTemplate(notification) {
    const { prNumber, oldStatus, newStatus, user, notes, metadata } = notification;
    const baseData = {
        prNumber,
        oldStatus,
        newStatus,
        userName: user.name,
        userEmail: user.email,
        notes: notes || 'No notes provided',
        description: metadata.description,
        amount: metadata.amount,
        currency: metadata.currency,
        department: metadata.department,
        requiredDate: metadata.requiredDate
    };
    switch (newStatus) {
        case pr_1.PRStatus.PENDING_APPROVAL:
            return {
                name: 'pr-pending-approval',
                data: Object.assign(Object.assign({}, baseData), { subject: `PR ${prNumber} Requires Your Approval` })
            };
        case pr_1.PRStatus.REVISION_REQUIRED:
            return {
                name: 'pr-revision-required',
                data: Object.assign(Object.assign({}, baseData), { subject: `PR ${prNumber} Requires Revision` })
            };
        case pr_1.PRStatus.REJECTED:
            return {
                name: 'pr-rejected',
                data: Object.assign(Object.assign({}, baseData), { subject: `PR ${prNumber} Has Been Rejected` })
            };
        default:
            return {
                name: 'pr-status-change',
                data: Object.assign(Object.assign({}, baseData), { subject: `PR ${prNumber} Status Updated to ${newStatus}` })
            };
    }
}
//# sourceMappingURL=notifications.js.map