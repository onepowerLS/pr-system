import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import * as nodemailer from 'nodemailer';

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

// Callable function to send test email
export const testEmailNotification = functions.https.onCall(async (data, context) => {
    try {
        // Send test email
        const timestamp = new Date().toISOString();
        const info = await transporter.sendMail({
            from: '"1PWR Test System" <noreply@1pwrafrica.com>',
            to: 'mso@1pwrafrica.com',
            subject: 'Test Email from Callable Function - ' + timestamp,
            text: 'Hello world! This is a test email sent at ' + timestamp,
            html: '<b>Hello world!</b> This is a test email sent at ' + timestamp
        });

        console.log('Message sent:', info.messageId);
        return {
            success: true,
            messageId: info.messageId,
            response: info.response
        };
    } catch (error: any) {
        console.error('Error sending email:', error);
        throw new functions.https.HttpsError('internal', error.message);
    }
});
