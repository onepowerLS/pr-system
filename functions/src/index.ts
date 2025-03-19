import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as nodemailer from 'nodemailer';
import cors from 'cors';

// Initialize Firebase Admin
admin.initializeApp();
const db = admin.firestore();
const FieldValue = admin.firestore.FieldValue;

// Configure CORS middleware
const corsHandler = cors({
  origin: true, // Allow requests from any origin
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
});

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

interface NotificationPayload {
    notification: {
        prId: string;
        prNumber: string;
        oldStatus: string;
        newStatus: string;
        user: {
            email: string;
            name: string;
        };
        notes: string;
        metadata: {
            description: string;
            amount: number;
            currency: string;
            department: string;
            requiredDate: string;
            isUrgent?: boolean;
        };
    };
    recipients: string[];
    cc?: string[];
    emailBody: {
        subject?: string;
        text: string;
        html: string;
    };
    metadata?: {
        prUrl: string;
        requestorEmail: string;
        approverInfo?: {
            id: string;
            email: string;
            name: string;
        };
    };
}

// Helper function to generate appropriate email subject
function getEmailSubject(notification: NotificationPayload['notification'], emailBody: NotificationPayload['emailBody']): string {
    // If a subject is provided in the emailBody, use that
    if (emailBody.subject) {
        return emailBody.subject;
    }

    const { prNumber, oldStatus, newStatus, metadata } = notification;
    const isUrgent = metadata?.isUrgent || false;
    const urgentPrefix = isUrgent ? 'URGENT: ' : '';
    
    // New PR submission
    if (oldStatus === '' && newStatus === 'SUBMITTED') {
        return `${urgentPrefix}New Purchase Request: PR #${prNumber}`;
    }
    
    // Status changes
    return `${urgentPrefix}${newStatus}: PR #${prNumber}`;
}

// Function to send PR notification
export const sendPRNotification = functions.https.onCall(async (data: NotificationPayload, context) => {
    console.log('Starting sendPRNotification with data:', JSON.stringify(data, null, 2));

    if (!context.auth) {
        console.error('Authentication missing');
        throw new functions.https.HttpsError(
            'unauthenticated',
            'User must be authenticated to send notifications'
        );
    }

    // Validate required fields
    if (!data.notification?.prId || !data.notification?.prNumber || !Array.isArray(data.recipients) || data.recipients.length === 0) {
        console.error('Invalid arguments:', { 
            prId: data.notification?.prId,
            prNumber: data.notification?.prNumber,
            recipients: data.recipients
        });
        throw new functions.https.HttpsError(
            'invalid-argument',
            'The function must be called with valid prId, prNumber, and recipients array.'
        );
    }

    const { notification, recipients, cc = [], emailBody, metadata = { requestorEmail: '' } } = data;
    console.log('Preparing to send emails to:', { recipients, cc });

    // Normalize all email addresses to lowercase to prevent case-sensitivity duplicates
    const normalizedRecipients = recipients.map(email => email.toLowerCase());
    
    // Normalize and deduplicate CC list
    const normalizedCc = Array.from(new Set(cc.map(email => email.toLowerCase())));
    
    console.log('Normalized recipients and CC:', { 
        normalizedRecipients, 
        normalizedCc,
        originalRecipients: recipients,
        originalCc: cc
    });

    // Define a type for our email results
    type EmailResult = {
        success: boolean;
        recipient: string;
        error?: any;
        info?: any;
    };

    try {
        // Send email to each recipient
        const emailPromises = normalizedRecipients.map(async recipient => {
            console.log('Sending email to:', recipient);
            const mailOptions = {
                from: '"1PWR System" <noreply@1pwrafrica.com>',
                to: recipient,
                // Filter out the current recipient from CC list to avoid duplicates
                cc: normalizedCc.filter(email => email !== recipient).filter(Boolean),
                subject: getEmailSubject(notification, emailBody),
                text: emailBody.text,
                html: emailBody.html
            };
            console.log('Mail options:', JSON.stringify(mailOptions, null, 2));
            
            try {
                const result = await transporter.sendMail(mailOptions);
                console.log('Email sent successfully to:', recipient, 'Result:', result);
                return {
                    success: true,
                    recipient,
                    info: result
                } as EmailResult;
            } catch (error) {
                console.error('Failed to send email to:', recipient, 'Error:', error);
                // Don't throw here, just log the error and continue with other recipients
                return {
                    success: false,
                    recipient,
                    error
                } as EmailResult;
            }
        });

        // Wait for all emails to be sent
        const results = await Promise.all(emailPromises);
        
        // Check if any emails failed
        const failedEmails = results.filter(result => !result.success);
        if (failedEmails.length > 0) {
            console.error('Some emails failed to send:', failedEmails);
            // Continue with logging, but note the partial failure
        } else {
            console.log('All emails sent successfully:', results);
        }

        // Log successful notification
        const logData = {
            type: 'STATUS_CHANGE',
            status: failedEmails.length > 0 ? 'partial' : 'sent',
            timestamp: FieldValue.serverTimestamp(),
            notification,
            recipients,
            cc,
            emailBody,
            metadata,
            failedRecipients: failedEmails.length > 0 ? failedEmails.map(f => f.recipient) : []
        };
        console.log('Logging notification:', logData);
        
        await db.collection('notificationLogs').add(logData);
        console.log('Notification logged successfully');

        return { 
            success: failedEmails.length === 0,
            partialSuccess: failedEmails.length > 0 && failedEmails.length < recipients.length,
            failedRecipients: failedEmails.length > 0 ? failedEmails.map(f => f.recipient) : []
        };
    } catch (error) {
        console.error('Error in sendPRNotification:', error);
        throw new functions.https.HttpsError(
            'internal',
            'Failed to send notification: ' + (error instanceof Error ? error.message : String(error))
        );
    }
});

export const sendSubmissionEmail = functions.https.onRequest(async (req, res) => {
    corsHandler(req, res, async () => {
        // Handle preflight requests
        if (req.method === 'OPTIONS') {
            res.status(204).send('');
            return;
        }

        const { email, name, prNumber, oldStatus, newStatus, notes } = req.body;

        if (!email || !name || !prNumber || !oldStatus || !newStatus) {
            res.status(400).json({ error: 'Missing required fields' });
            return;
        }

        try {
            const info = await transporter.sendMail({
                from: '"1PWR System" <noreply@1pwrafrica.com>',
                to: email,
                subject: `PR ${prNumber} Status Changed to ${newStatus}`,
                html: `
                    <div style="font-family: Arial, sans-serif; padding: 20px;">
                        <h2>Purchase Request Status Change</h2>
                        <p>Dear ${name},</p>
                        <p>The status of PR #${prNumber} has been changed:</p>
                        <ul>
                            <li>From: ${oldStatus}</li>
                            <li>To: ${newStatus}</li>
                        </ul>
                        ${notes ? `<p><strong>Notes:</strong> ${notes}</p>` : ''}
                        <p>Please log in to the system to view more details.</p>
                        <p>Best regards,<br>1PWR System</p>
                    </div>
                `
            });

            console.log('Status change email sent:', info.messageId);
            res.status(200).json({ success: true });
        } catch (error) {
            console.error('Error sending email:', error);
            res.status(500).json({ error: 'Failed to send email' });
        }
    });
});

// New function to handle revision required notifications with CORS support
export const sendRevisionRequiredNotification = functions.https.onCall(async (data: NotificationPayload, context) => {
    console.log('Starting sendRevisionRequiredNotification with data:', JSON.stringify(data, null, 2));

    if (!context.auth) {
        console.error('Authentication missing');
        throw new functions.https.HttpsError(
            'unauthenticated',
            'User must be authenticated to send notifications'
        );
    }

    // Validate required fields
    if (!data.notification?.prId || !data.notification?.prNumber || !Array.isArray(data.recipients) || data.recipients.length === 0) {
        console.error('Invalid arguments:', { 
            prId: data.notification?.prId,
            prNumber: data.notification?.prNumber,
            recipients: data.recipients
        });
        throw new functions.https.HttpsError(
            'invalid-argument',
            'The function must be called with valid prId, prNumber, and recipients array.'
        );
    }

    const { notification, recipients, cc = [], emailBody, metadata = { requestorEmail: '' } } = data;
    console.log('Preparing to send revision required emails to:', { recipients, cc });

    // Normalize all email addresses to lowercase to prevent case-sensitivity duplicates
    const normalizedRecipients = recipients.map(email => email.toLowerCase());
    
    // Normalize and deduplicate CC list
    const normalizedCc = Array.from(new Set(cc.map(email => email.toLowerCase())));
    
    console.log('Normalized recipients and CC:', { 
        normalizedRecipients, 
        normalizedCc,
        originalRecipients: recipients,
        originalCc: cc
    });

    // Define a type for our email results
    type EmailResult = {
        success: boolean;
        recipient: string;
        error?: any;
        info?: any;
    };

    try {
        // Send email to each recipient
        const emailPromises = normalizedRecipients.map(async recipient => {
            console.log('Sending revision required email to:', recipient);
            const mailOptions = {
                from: '"1PWR System" <noreply@1pwrafrica.com>',
                to: recipient,
                cc: normalizedCc.filter(email => email !== recipient).filter(Boolean),
                subject: getEmailSubject(notification, emailBody),
                text: emailBody.text,
                html: emailBody.html
            };
            console.log('Mail options:', JSON.stringify(mailOptions, null, 2));
            
            try {
                const result = await transporter.sendMail(mailOptions);
                console.log('Revision required email sent successfully to:', recipient, 'Result:', result);
                return {
                    success: true,
                    recipient,
                    info: result
                } as EmailResult;
            } catch (error) {
                console.error('Failed to send revision required email to:', recipient, 'Error:', error);
                return {
                    success: false,
                    recipient,
                    error
                } as EmailResult;
            }
        });

        // Wait for all emails to be sent
        const results = await Promise.all(emailPromises);
        
        // Check if any emails failed
        const failedEmails = results.filter(result => !result.success);
        if (failedEmails.length > 0) {
            console.error('Some revision required emails failed to send:', failedEmails);
        } else {
            console.log('All revision required emails sent successfully:', results);
        }

        // Log successful notification
        const logData = {
            type: 'REVISION_REQUIRED',
            status: failedEmails.length > 0 ? 'partial' : 'sent',
            timestamp: FieldValue.serverTimestamp(),
            notification,
            recipients,
            cc,
            emailBody,
            metadata,
            failedRecipients: failedEmails.length > 0 ? failedEmails.map(f => f.recipient) : []
        };
        console.log('Logging revision required notification:', logData);
        
        await db.collection('notificationLogs').add(logData);
        console.log('Revision required notification logged successfully');

        return { 
            success: failedEmails.length === 0,
            partialSuccess: failedEmails.length > 0 && failedEmails.length < recipients.length,
            failedRecipients: failedEmails.length > 0 ? failedEmails.map(f => f.recipient) : []
        };
    } catch (error) {
        console.error('Error in sendRevisionRequiredNotification:', error);
        throw new functions.https.HttpsError(
            'internal',
            'Failed to send revision required notification: ' + (error instanceof Error ? error.message : String(error))
        );
    }
});

// Firestore trigger to send emails for new notifications
export const processNotifications = functions.firestore
  .document('notifications/{notificationId}')
  .onCreate(async (snapshot, context) => {
    const notificationData = snapshot.data();
    console.log('Processing new notification:', JSON.stringify(notificationData, null, 2));

    if (!notificationData || !notificationData.recipients || notificationData.recipients.length === 0) {
      console.error('Invalid notification data or missing recipients');
      return { success: false, error: 'Invalid notification data or missing recipients' };
    }

    try {
      // Extract data from the notification
      const { 
        prId,
        prNumber, 
        recipients, 
        emailContent
      } = notificationData;

      // Check for duplicate notifications in notificationLogs
      const notificationLogsRef = db.collection('notificationLogs');
      const duplicateQuery = await notificationLogsRef
        .where('notification.prId', '==', prId)
        .where('type', '==', notificationData.type || 'PR_SUBMITTED')
        .where('status', '==', 'sent')
        .where('timestamp', '>=', new Date(Date.now() - 5 * 60 * 1000)) // Last 5 minutes
        .get();

      if (!duplicateQuery.empty) {
        console.log(`Found ${duplicateQuery.size} recent notifications for PR ${prId}, skipping to avoid duplicates`);
        
        // Update the notification status to indicate it was skipped due to duplicate
        await snapshot.ref.update({
          status: 'skipped',
          reason: 'duplicate_detected',
          duplicateCount: duplicateQuery.size,
          updatedAt: FieldValue.serverTimestamp()
        });
        
        return { 
          success: true, 
          skipped: true, 
          reason: 'duplicate_detected',
          duplicateCount: duplicateQuery.size
        };
      }

      // Prepare email options
      const mailOptions: {
        from: string;
        to: string;
        cc?: string;
        subject: string;
        text: string;
        html: string;
      } = {
        from: '"1PWR System" <noreply@1pwrafrica.com>',
        to: recipients.join(','),
        subject: emailContent?.subject || `PR ${prNumber} Status Update`,
        text: emailContent?.text || `PR ${prNumber} status has been updated.`,
        html: emailContent?.html || `<p>PR ${prNumber} status has been updated.</p>`
      };
      
      // Add CC if present
      if (notificationData.cc && notificationData.cc.length > 0) {
        // Normalize all CC emails to lowercase and remove duplicates
        const normalizedCc = Array.from(
          new Set(notificationData.cc.map((email: string) => email.toLowerCase()))
        );
        mailOptions.cc = normalizedCc.join(',');
      }

      console.log('Sending email with options:', JSON.stringify(mailOptions, null, 2));
      
      // Send the email
      const result = await transporter.sendMail(mailOptions);
      console.log('Email sent successfully:', result);
      
      // Update the notification status in Firestore
      await snapshot.ref.update({
        status: 'sent',
        emailSentAt: FieldValue.serverTimestamp(),
        emailResult: result
      });
      
      // Also log to notificationLogs for tracking
      await notificationLogsRef.add({
        type: notificationData.type || 'PR_SUBMITTED',
        status: 'sent',
        timestamp: FieldValue.serverTimestamp(),
        notification: {
          prId: prId,
          prNumber: prNumber
        },
        recipients: recipients,
        cc: notificationData.cc || [],
        emailBody: {
          subject: emailContent?.subject,
          text: emailContent?.text,
          html: emailContent?.html
        }
      });
      
      return { success: true, messageId: result.messageId };
    } catch (error: unknown) {
      console.error('Error sending email notification:', error);
      
      // Update the notification with error information
      await snapshot.ref.update({
        status: 'error',
        error: error instanceof Error ? error.message : String(error),
        lastAttempt: FieldValue.serverTimestamp()
      });
      
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });
