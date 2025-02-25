/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import {onCall} from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import * as nodemailer from "nodemailer";
import * as admin from "firebase-admin";

// Initialize Firebase Admin
admin.initializeApp();

// Create mail transporter
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.SMTP_EMAIL,
    pass: process.env.SMTP_PASSWORD
  }
});

interface NotificationPayload {
  notification: {
    type: string;
    prId: string;
    prNumber: string;
    oldStatus: string | null;
    newStatus: string;
    metadata?: {
      isUrgent?: boolean;
      requestorEmail?: string;
    };
  };
  recipients: string[];
  cc?: string[];
  emailBody: {
    subject: string;
    text: string;
    html: string;
  };
}

// Function to send PR notification
export const sendPRNotification = onCall<NotificationPayload>(async (request) => {
  const {data, auth} = request;
  logger.info("Starting sendPRNotification with data:", data);

  if (!auth) {
    throw new Error("User must be authenticated to send notifications");
  }

  // Validate required fields
  if (!data.notification?.prId || !data.notification?.prNumber || !Array.isArray(data.recipients) || data.recipients.length === 0) {
    logger.error("Invalid arguments:", {
      prId: data.notification?.prId,
      prNumber: data.notification?.prNumber,
      recipients: data.recipients
    });
    throw new Error("Invalid arguments: prId, prNumber, and recipients are required");
  }

  const {notification, recipients, cc = [], emailBody} = data;
  logger.info("Preparing to send emails to:", {recipients, cc});

  try {
    // Send email to each recipient
    const emailPromises = recipients.map(async (recipient) => {
      logger.info("Sending email to:", recipient);
      const mailOptions = {
        from: "\"1PWR System\" <noreply@1pwrafrica.com>",
        to: recipient,
        cc: cc.filter((email) => email !== recipient).filter(Boolean),
        subject: emailBody.subject,
        text: emailBody.text,
        html: emailBody.html
      };
      logger.info("Mail options:", mailOptions);
      
      try {
        const result = await transporter.sendMail(mailOptions);
        logger.info("Email sent successfully to:", recipient, "Result:", result);
        return result;
      } catch (error) {
        logger.error("Failed to send email to:", recipient, "Error:", error);
        throw error;
      }
    });

    // Wait for all emails to be sent
    const results = await Promise.all(emailPromises);
    logger.info("All emails sent successfully:", results);

    // Log successful notification
    const logData = {
      type: "STATUS_CHANGE",
      status: "sent",
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      notification,
      recipients,
      cc,
      emailBody
    };
    logger.info("Logging notification:", logData);
    
    await admin.firestore().collection("notificationLogs").add(logData);
    logger.info("Notification logged successfully");

    return {success: true};
  } catch (error) {
    logger.error("Error in sendPRNotification:", error);
    throw new Error("Failed to send notification: " + (error instanceof Error ? error.message : String(error)));
  }
});
