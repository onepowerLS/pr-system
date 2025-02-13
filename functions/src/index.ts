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
export const sendPRNotification = functions.https.onRequest(async (req, res) => {
    // Add CORS headers
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, POST');
    res.set('Access-Control-Allow-Headers', 'Content-Type');

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        res.status(204).send('');
        return;
    }

    if (req.method !== 'POST') {
        res.status(405).send('Method Not Allowed');
        return;
    }

    try {
        const { prId, prNumber, status, notes } = req.body;
        
        // Get PR data from Firestore
        const prDoc = await admin.firestore().collection('purchaseRequests').doc(prId).get();
        if (!prDoc.exists) {
            res.status(404).send('PR not found');
            return;
        }

        const prData = prDoc.data();
        if (!prData) {
            res.status(404).send('PR data not found');
            return;
        }

        // Generate email content
        const emailContent = generatePREmailContent({
            ...prData,
            prNumber,
            status,
            notes
        });

        // Send email notification
        const info = await transporter.sendMail({
            from: '"1PWR PR System" <noreply@1pwrafrica.com>',
            to: prData.requestorEmail,
            subject: `PR ${prNumber} Status Update: ${status}`,
            html: emailContent.html
        });

        console.log('Email sent:', info);
        res.status(200).json({ success: true, messageId: info.messageId });
    } catch (error) {
        console.error('Error sending notification:', error);
        res.status(500).json({ 
            success: false, 
            error: error instanceof Error ? error.message : 'Unknown error' 
        });
    }
});

// Function to send approver notification
export const sendApproverNotification = functions.https.onRequest(async (req, res) => {
    // Add CORS headers
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, POST');
    res.set('Access-Control-Allow-Headers', 'Content-Type');

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        res.status(204).send('');
        return;
    }

    if (req.method !== 'POST') {
        res.status(405).send('Method Not Allowed');
        return;
    }

    try {
        const { prId, prNumber, approverId } = req.body;
        
        // Get approver data
        const approverDoc = await admin.firestore().collection('users').doc(approverId).get();
        if (!approverDoc.exists) {
            res.status(404).send('Approver not found');
            return;
        }

        const approverData = approverDoc.data();
        if (!approverData?.email) {
            res.status(400).send('Approver email not found');
            return;
        }

        // Get PR data
        const prDoc = await admin.firestore().collection('purchaseRequests').doc(prId).get();
        if (!prDoc.exists) {
            res.status(404).send('PR not found');
            return;
        }

        const prData = prDoc.data();
        if (!prData) {
            res.status(404).send('PR data not found');
            return;
        }

        // Send email notification
        const info = await transporter.sendMail({
            from: '"1PWR PR System" <noreply@1pwrafrica.com>',
            to: approverData.email,
            subject: `PR ${prNumber} Requires Your Approval`,
            html: `
                <h2>Purchase Request Approval Required</h2>
                <p>A new purchase request requires your approval:</p>
                <ul>
                    <li>PR Number: ${prNumber}</li>
                    <li>Requestor: ${prData.requestorEmail}</li>
                    <li>Department: ${prData.department}</li>
                    <li>Amount: ${prData.estimatedAmount} ${prData.currency}</li>
                    <li>Required Date: ${new Date(prData.requiredDate).toLocaleDateString()}</li>
                </ul>
                <p>Please <a href="${process.env.VITE_APP_URL}/pr/${prId}">click here</a> to review the purchase request.</p>
            `
        });

        console.log('Approver notification sent:', info);
        res.status(200).json({ success: true, messageId: info.messageId });
    } catch (error) {
        console.error('Error sending approver notification:', error);
        res.status(500).json({ 
            success: false, 
            error: error instanceof Error ? error.message : 'Unknown error' 
        });
    }
});

// Function to send status change notification
export const sendStatusChangeNotification = functions.https.onCall(async (data, context) => {
    try {
        const { notification, recipients } = data;
        const { 
            prId, 
            prNumber, 
            description, 
            oldStatus, 
            newStatus, 
            changedBy, 
            notes, 
            baseUrl,
            approverName,
            approverEmail,
            department,
            requiredDate
        } = notification;

        // Create email content
        const text = `
            Purchase Request ${prNumber}

            Status Changed: ${oldStatus} → ${newStatus}
            Updated By: ${changedBy.name} (${changedBy.email})

            Department: ${department}
            Description: ${description}
            Required Date: ${requiredDate}
            ${approverName && approverEmail ? `\nAssigned Approver: ${approverName} (${approverEmail})` : ''}

            Notes: ${notes || ''}

            Please click here to review the purchase request in the system: ${baseUrl}/pr/${prId}
        `;

        const html = `
            <h2>Purchase Request ${prNumber}</h2>

            <p><strong>Status Changed:</strong> ${oldStatus} → ${newStatus}</p>
            <p><strong>Updated By:</strong> ${changedBy.name} (${changedBy.email})</p>

            <p><strong>Department:</strong> ${department}</p>
            <p><strong>Description:</strong> ${description}</p>
            <p><strong>Required Date:</strong> ${requiredDate}</p>
            ${approverName && approverEmail ? 
                `<p><strong>Assigned Approver:</strong> ${approverName} (${approverEmail})</p>` 
                : ''}

            <p><strong>Notes:</strong> ${notes || ''}</p>

            <p>Please <a href="${baseUrl}/pr/${prId}">click here</a> to review the purchase request in the system.</p>
        `;

        // Send email
        const info = await transporter.sendMail({
            from: '"1PWR PR System" <noreply@1pwrafrica.com>',
            to: recipients.join(', '),
            subject: `Purchase Request ${prNumber} - Status Changed: ${oldStatus} → ${newStatus}`,
            text,
            html
        });

        console.log('Status change notification sent:', info.messageId);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('Error sending status change notification:', error);
        throw new functions.https.HttpsError(
            'internal',
            'Failed to send status change notification',
            error instanceof Error ? error.message : 'Unknown error'
        );
    }
});

// Test email function
export const testEmailNotification = functions.https.onRequest(async (req, res) => {
    // Add CORS headers
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, POST');
    res.set('Access-Control-Allow-Headers', 'Content-Type');

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        res.status(204).send('');
        return;
    }

    if (req.method !== 'POST') {
        res.status(405).send('Method Not Allowed');
        return;
    }

    try {
        const testInfo = await transporter.sendMail({
            from: '"1PWR PR System" <noreply@1pwrafrica.com>',
            to: req.body.email,
            subject: 'Test Email from PR System',
            text: `This is a test email sent at ${new Date().toISOString()}`,
            html: `<p>This is a test email sent at ${new Date().toISOString()}</p>`
        });

        console.log('Test email sent:', testInfo.messageId);
        res.status(200).json({ success: true, messageId: testInfo.messageId });
    } catch (error) {
        console.error('Error sending test email:', error);
        res.status(500).json({ 
            success: false, 
            error: error instanceof Error ? error.message : 'Unknown error' 
        });
    }
});

// Function to send PR submission notification
export const sendSubmissionEmail = functions.https.onRequest(async (req, res) => {
    // Add CORS headers
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, POST');
    res.set('Access-Control-Allow-Headers', 'Content-Type');

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        res.status(204).send('');
        return;
    }

    if (req.method !== 'POST') {
        res.status(405).send('Method Not Allowed');
        return;
    }

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
        } = req.body;

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
                
                <p>Please <a href="${process.env.VITE_APP_URL}/pr/${prNumber}">click here</a> to review the purchase request in the system.</p>
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
        res.status(200).json({ success: true, messageId: info.messageId });
    } catch (error) {
        console.error('Error sending submission notification:', error);
        res.status(500).json({ 
            success: false, 
            error: error instanceof Error ? error.message : 'Unknown error' 
        });
    }
});

export const sendStatusChangeNotification = functions.https.onRequest(async (req, res) => {
    // Add CORS headers
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, POST');
    res.set('Access-Control-Allow-Headers', 'Content-Type');

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        res.status(204).send('');
        return;
    }

    if (req.method !== 'POST') {
        res.status(405).send('Method Not Allowed');
        return;
    }

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
        requiredDate,
        baseUrl
    } = req.body;

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

Please visit ${baseUrl}/pr/${prNumber} to review the purchase request in the system.
`,
            html: `
<h2>Purchase Request ${prNumber}</h2>

<p><strong>Status Changed:</strong> ${oldStatus} → ${newStatus}</p>
<p><strong>Updated By:</strong> ${updaterName} (${updaterEmail})</p>

<p><strong>Department:</strong> ${department}</p>
<p><strong>Description:</strong> ${description}</p>
<p><strong>Required Date:</strong> ${requiredDate}</p>

<p><strong>Notes:</strong> ${notes}</p>

<p>Please <a href="${baseUrl}/pr/${prNumber}">click here</a> to review the purchase request in the system.</p>
`
        });

        console.log('Status change email sent:', info.messageId);
        res.status(200).json({ success: true });
    } catch (error) {
        console.error('Error sending status change email:', error);
        res.status(500).json({ 
            success: false, 
            error: error instanceof Error ? error.message : 'Unknown error' 
        });
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
