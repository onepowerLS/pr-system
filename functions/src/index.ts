import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import * as nodemailer from 'nodemailer';
import { updateUserPassword } from './updateUserPassword';
import { setUserClaims } from './setUserClaims';
import { setupInitialAdmin } from './setupInitialAdmin';
import { syncUserEmails } from './syncUserEmails';
import { createUser } from './createUser';
import { updateUserEmail } from './updateUserEmail';

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
const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

// Helper function to generate PR email content
const generatePREmailContent = (prData: any) => {
    const items = prData.items.map((item: any, index: number) => {
        const attachmentsList = item.attachments?.length > 0
            ? `<ul style="margin: 0; padding-left: 20px;">
                ${item.attachments.map((att: any) => 
                    `<li style="margin-bottom: 4px;">
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
                    </li>`
                ).join('')}
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
    `}).join('');

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
export const sendPRNotification = functions.https.onCall(async (data, context) => {
    // Add CORS headers
    const corsWhitelist = [
        'http://localhost:5173',
        'http://localhost:3000',
        'https://pr-system-4ea55.web.app',
        'https://pr-system-4ea55.firebaseapp.com'
    ];

    // Validate origin
    const origin = context.rawRequest?.headers?.origin;
    if (!origin || !corsWhitelist.includes(origin)) {
        throw new functions.https.HttpsError(
            'failed-precondition',
            'Origin not allowed'
        );
    }

    try {
        if (!data.requestorEmail) {
            throw new functions.https.HttpsError(
                'invalid-argument',
                'Requestor email is required'
            );
        }

        console.log('Received notification data:', data);
        console.log('Items with attachments:', data.items?.map((item: { description: string; attachments: any[] }) => ({
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
    } catch (error) {
        console.error('Error sending PR notification:', error);
        throw new functions.https.HttpsError('internal', 'Failed to send PR notification');
    }
});

// Function to send status change notification
export const sendStatusChangeEmail = functions.https.onCall(async (data, context) => {
    try {
        const { notification, recipients } = data;
        const { prId, prNumber, description, oldStatus, newStatus, changedBy, notes } = notification;

        // Create email content
        const emailContent = {
            text: `
                PR Status Change Notification - ${prNumber}
                
                Description: ${description}
                Status Changed: ${oldStatus} → ${newStatus}
                Changed By: ${changedBy.email}
                Date: ${new Date().toLocaleDateString()}
                ${notes ? `\nNotes: ${notes}` : ''}
                
                Please review the purchase request in the system.
            `,
            html: `
                <h2>PR Status Change Notification - ${prNumber}</h2>
                <p><strong>Description:</strong> ${description}</p>
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
    } catch (error) {
        console.error('Error sending status change notification:', error);
        throw new functions.https.HttpsError('internal', 'Failed to send status change notification');
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

// Function to send PR submission notification
export const sendSubmissionEmail = functions.https.onCall(async (data, context) => {
    try {
        const {
            prNumber,
            description,
            submittedBy,
            requestor,
            category,
            expenseType,
            site,
            amount,
            currency,
            requiredDate
        } = data;

        // Create email content
        const emailContent = {
            text: `
                New PR Submission - ${prNumber}
                
                Description: ${description}
                Submitted By: ${submittedBy}
                Requestor: ${requestor.name} (${requestor.email})
                Department: ${requestor.department}
                Category: ${category}
                Expense Type: ${expenseType}
                Site: ${site}
                Amount: ${amount} ${currency}
                Required Date: ${requiredDate}
                Date: ${new Date().toLocaleDateString()}
                
                Please review the purchase request in the system.
            `,
            html: `
                <h2>New PR Submission - ${prNumber}</h2>
                <p><strong>Description:</strong> ${description}</p>
                <p><strong>Submitted By:</strong> ${submittedBy}</p>
                <p><strong>Requestor:</strong> ${requestor.name} (${requestor.email})</p>
                <p><strong>Department:</strong> ${requestor.department}</p>
                <p><strong>Category:</strong> ${category}</p>
                <p><strong>Expense Type:</strong> ${expenseType}</p>
                <p><strong>Site:</strong> ${site}</p>
                <p><strong>Amount:</strong> ${amount} ${currency}</p>
                <p><strong>Required Date:</strong> ${requiredDate}</p>
                <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
                
                <p>Please <a href="${process.env.VITE_APP_URL || 'http://localhost:5173'}/pr/${prNumber}">click here</a> to review the purchase request in the system.</p>
            `
        };

        // Send email to procurement team and cc the requestor
        const info = await transporter.sendMail({
            from: '"1PWR PR System" <noreply@1pwrafrica.com>',
            to: 'procurement@1pwrafrica.com',
            cc: requestor.email,
            subject: `New PR Submission - ${prNumber}`,
            text: emailContent.text,
            html: emailContent.html
        });

        console.log('Submission notification sent:', info.messageId);
        return {
            success: true,
            messageId: info.messageId
        };
    } catch (error) {
        console.error('Error sending submission notification:', error);
        throw new functions.https.HttpsError('internal', 'Failed to send submission notification');
    }
});

export const sendStatusChangeNotification = functions.https.onCall(async (data) => {
    const {
        prNumber,
        description,
        oldStatus,
        newStatus,
        updaterName,
        updaterEmail,
        requestorEmail,
        notes,
        department,
        requiredDate
    } = data;

    try {
        const info = await transporter.sendMail({
            from: '"1PWR PR System" <noreply@1pwrafrica.com>',
            to: 'procurement@1pwrafrica.com',
            cc: requestorEmail,
            subject: `PR Status Change - ${prNumber}`,
            text: `
Purchase Request ${prNumber}

Status Changed: ${oldStatus} → ${newStatus}
Updated By: ${updaterName} (${updaterEmail})

Department: ${department}
Description: ${description}
Required Date: ${requiredDate}

Notes: ${notes}

Please click here to review the purchase request in the system.
`,
            html: `
<h2>Purchase Request ${prNumber}</h2>

<p><strong>Status Changed:</strong> ${oldStatus} → ${newStatus}<br>
<strong>Updated By:</strong> ${updaterName} (${updaterEmail})</p>

<p><strong>Department:</strong> ${department}<br>
<strong>Description:</strong> ${description}<br>
<strong>Required Date:</strong> ${requiredDate}</p>

<p><strong>Notes:</strong> ${notes}</p>

<p>Please <a href="${process.env.VITE_APP_URL}/pr/${prNumber}">click here</a> to review the purchase request in the system.</p>
`
        });

        console.log('Status change email sent:', info.messageId);
        return { success: true };
    } catch (error) {
        console.error('Error sending status change email:', error);
        throw new Error('Failed to send status change email');
    }
});

export {
    updateUserPassword,
    setUserClaims,
    setupInitialAdmin,
    syncUserEmails,
    createUser,
    updateUserEmail
};
