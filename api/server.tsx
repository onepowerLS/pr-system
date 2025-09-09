import "dotenv/config";
import express from "express";
import sgMail from "@sendgrid/mail";

// Import your templates
import { generatePRApprovalEmail } from "../src/services/notifications/templates/newPRSubmitted";
import { generatePendingApprovalEmail } from "../src/services/notifications/templates/pendingApprovalTemplate";

const app = express();
app.use(express.json());

// Ensure SendGrid is configured
if (!process.env.VITE_SENDGRID_API_KEY) {
  throw new Error("SENDGRID_API_KEY is not set");
}
sgMail.setApiKey(process.env.VITE_SENDGRID_API_KEY);

app.post("/api/send-email", async (req, res) => {
  try {
    console.log(
      "Received email request with body:",
      JSON.stringify(req.body, null, 2)
    );

    const {
      to,
      cc,
      subject,
      prNumber,
      requestor,
      amount,
      currency,
      description,
      department,
      site,
      isUrgent,
      templateType, //decide which template to use
      pr,
      user,
      notes,
    } = req.body;

    if (!to) {
      throw new Error("Recipient email is required");
    }

    // Default PR link
    const prLink = `https://your-app-url.com/pr/${prNumber}`;

    // --- Choose the template ---
    let emailContent;

    if (templateType === "pendingApproval") {
      // Use the pending approval template
      emailContent = generatePendingApprovalEmail({
        pr,
        prNumber: prNumber || "DRAFT",
        user,
        notes,
        baseUrl: "https://your-app-url.com",
        isUrgent: isUrgent || false,
      });
    } else {
      // Fallback to new PR submitted template
      const emailParams = {
        to,
        cc,
        prNumber: prNumber || "DRAFT",
        requestor: requestor || "Unknown",
        amount: amount || 0,
        currency: currency || "LSL",
        prLink,
        description:
          description ||
          (subject
            ? subject.replace("New Purchase Request for Approval - ", "")
            : "No description"),
        department: department || "Not specified",
        site: site || "Not specified",
        isUrgent: isUrgent || (subject ? subject.includes("URGENT") : false),
      };

      emailContent = await generatePRApprovalEmail(
        emailParams.to,
        emailParams.cc,
        emailParams.prNumber,
        emailParams.requestor,
        emailParams.amount,
        emailParams.currency,
        emailParams.prLink,
        emailParams.description,
        emailParams.department,
        emailParams.site,
        emailParams.isUrgent
      );
    }

    console.log(
      "Generated email content:",
      JSON.stringify(
        {
          subject: emailContent.subject,
          html: emailContent.html.substring(0, 200) + "...", // Log first 200 chars
        },
        null,
        2
      )
    );

    const msg = {
      from: "noreply@1pwrafrica.com",
      to,
      cc,
      subject: emailContent.subject,
      html: emailContent.html,
      text: emailContent.text, //optional fallback
    };

    console.log("Email message prepared:", JSON.stringify(msg, null, 2));

    await sgMail.send(msg);

    res.json({ success: true });
  } catch (error: unknown) {
    console.error("SendGrid error:", error);

    if (error instanceof Error) {
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
    } else {
      console.error("Error (unknown type):", error);
    }

    res.status(500).json({ success: false, error: "Failed to send email" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
