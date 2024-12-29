"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.onPRStatusChange = void 0;
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const nodemailer = require("nodemailer");
// Initialize Firebase Admin
admin.initializeApp();
// Initialize Nodemailer with SMTP config
const transporter = nodemailer.createTransport({
    host: functions.config().smtp.host,
    port: parseInt(functions.config().smtp.port),
    secure: functions.config().smtp.secure === 'true',
    auth: {
        user: functions.config().smtp.user,
        pass: functions.config().smtp.password,
    },
});
// Function to format currency
const formatCurrency = (amount, currency) => {
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: currency,
    }).format(amount);
};
// Function to send email notification
const sendEmailNotification = async (to, subject, html) => {
    const mailOptions = {
        from: functions.config().smtp.from,
        to: to.join(", "),
        subject,
        html,
    };
    try {
        await transporter.sendMail(mailOptions);
        console.log("Email sent successfully");
    }
    catch (error) {
        console.error("Error sending email:", error);
        throw new Error("Failed to send email notification");
    }
};
// Cloud Function triggered on PR creation/update
exports.onPRStatusChange = functions.firestore
    .document("purchaseRequests/{prId}")
    .onWrite(async (change, context) => {
    const prId = context.params.prId;
    const newData = change.after.data();
    const oldData = change.before.data();
    // If this is a new PR (creation)
    if (!oldData && newData) {
        const formattedAmount = formatCurrency(newData.totalAmount, newData.currency);
        const emailHtml = `
        <h2>New Purchase Request Submitted</h2>
        <p>A new purchase request has been submitted with the following details:</p>
        <ul>
          <li><strong>PR Number:</strong> ${prId}</li>
          <li><strong>Requestor:</strong> ${newData.requestorName}</li>
          <li><strong>Department:</strong> ${newData.department}</li>
          <li><strong>Organization:</strong> ${newData.organization}</li>
          <li><strong>Description:</strong> ${newData.description}</li>
          <li><strong>Amount:</strong> ${formattedAmount}</li>
        </ul>
        <p>Please review this request at your earliest convenience.</p>
        <p>This is an automated message from the 1PWR Purchase Request System.</p>
      `;
        // Send to both procurement team and requestor
        const recipients = ["procurement@1pwrafrica.com", newData.requestorEmail];
        await sendEmailNotification(recipients, `New Purchase Request Submitted - ${prId}`, emailHtml);
        // Log the notification in Firestore
        await admin.firestore().collection("notifications").add({
            type: "PR_SUBMISSION",
            prId,
            recipients,
            sentAt: admin.firestore.FieldValue.serverTimestamp(),
            status: "sent",
        });
    }
});
//# sourceMappingURL=index.js.map