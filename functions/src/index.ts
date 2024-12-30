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

// Helper function to generate PR email content
const generatePREmailContent = (prData: any) => {
    const items = prData.items.map((item: any, index: number) => `
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
export const sendPRNotification = functions.https.onCall(async (data, context) => {
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
    } catch (error) {
        console.error('Error sending PR notification:', error);
        throw new functions.https.HttpsError('internal', 'Failed to send PR notification');
    }
});

// Test email function
export const testEmailNotification = functions.https.onCall(async (data, context) => {
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
    } catch (error) {
        console.error('Error sending test email:', error);
        throw new functions.https.HttpsError('internal', 'Failed to send test email');
    }
});
