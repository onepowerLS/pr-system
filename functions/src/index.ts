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

// Helper function to format currency
const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
    }).format(amount);
};

// Helper function to generate PR email content
const generatePREmailContent = (prData: any) => {
    const items = prData.items.map((item: any, index: number) => `
        <tr>
            <td>${index + 1}</td>
            <td>${item.description}</td>
            <td>${item.quantity}</td>
            <td>${formatCurrency(item.unitPrice)}</td>
            <td>${formatCurrency(item.unitPrice * item.quantity)}</td>
        </tr>
    `).join('');

    const totalAmount = prData.items.reduce((sum: number, item: any) => 
        sum + (item.unitPrice * item.quantity), 0);

    return {
        text: `
            New Purchase Request Submitted
            
            PR Number: ${prData.prNumber}
            Department: ${prData.department}
            Requestor: ${prData.requestorName} (${prData.requestorEmail})
            Date: ${new Date().toLocaleDateString()}
            Total Amount: ${formatCurrency(totalAmount)}
            
            Please review the purchase request in the system.
        `,
        html: `
            <h2>New Purchase Request Submitted</h2>
            <p><strong>PR Number:</strong> ${prData.prNumber}</p>
            <p><strong>Department:</strong> ${prData.department}</p>
            <p><strong>Requestor:</strong> ${prData.requestorName} (${prData.requestorEmail})</p>
            <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
            
            <h3>Items:</h3>
            <table border="1" cellpadding="5" style="border-collapse: collapse; width: 100%;">
                <tr>
                    <th>#</th>
                    <th>Description</th>
                    <th>Quantity</th>
                    <th>Unit Price</th>
                    <th>Total</th>
                </tr>
                ${items}
                <tr>
                    <td colspan="4" style="text-align: right;"><strong>Total Amount:</strong></td>
                    <td><strong>${formatCurrency(totalAmount)}</strong></td>
                </tr>
            </table>
            
            <p>Please <a href="http://localhost:5173/pr/${prData.prNumber}">click here</a> to review the purchase request in the system.</p>
        `
    };
};

// Function to send PR notification
export const sendPRNotification = functions.https.onCall(async (data, context) => {
    try {
        const emailContent = generatePREmailContent(data);
        
        // Send to procurement
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
            messageId: procurementInfo.messageId,
            response: procurementInfo.response
        };
    } catch (error: any) {
        console.error('Error sending PR notification:', error);
        throw new functions.https.HttpsError('internal', error.message);
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
