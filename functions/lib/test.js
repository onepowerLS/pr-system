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
exports.sendTestEmail = void 0;
const admin = __importStar(require("firebase-admin"));
const functions = __importStar(require("firebase-functions"));
// Initialize Firebase Admin
admin.initializeApp();
exports.sendTestEmail = functions.https.onRequest(async (req, res) => {
    const nodemailer = require('nodemailer');
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
    try {
        // Send test email
        const timestamp = new Date().toISOString();
        const info = await transporter.sendMail({
            from: '"1PWR Test System" <noreply@1pwrafrica.com>',
            to: 'mso@1pwrafrica.com',
            subject: 'Test Email from HTTP Function - ' + timestamp,
            text: 'Hello world! This is a test email sent at ' + timestamp,
            html: '<b>Hello world!</b> This is a test email sent at ' + timestamp
        });
        console.log('Message sent:', info.messageId);
        res.status(200).json({
            success: true,
            messageId: info.messageId,
            response: info.response
        });
    }
    catch (error) {
        console.error('Error sending email:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});
//# sourceMappingURL=test.js.map