import "dotenv/config";
import express from 'express';
import sgMail from '@sendgrid/mail';
import { generatePRApprovalEmail } from '../src/services/notifications/templates/newPRSubmitted';

const app = express();
app.use(express.json());

if (!process.env.VITE_SENDGRID_API_KEY) {
  throw new Error("SENDGRID_API_KEY is not set");
}
sgMail.setApiKey(process.env.VITE_SENDGRID_API_KEY);

app.post("/api/send-email", async (req, res) => {
  try {
    console.log('Received email request with body:', JSON.stringify(req.body, null, 2));
    
    const { 
      to, 
      subject, 
      prNumber, 
      requestor, 
      amount, 
      currency,
      description,
      department,
      site,
      isUrgent
    } = req.body;

    if (!to) {
      throw new Error("Recipient email is required");
    }

    // Generate the PR link (update with your actual PR view URL structure)
    const prLink = `https://your-app-url.com/pr/${prNumber}`;
    
    const emailParams = {
      to,
      prNumber: prNumber || 'DRAFT',
      requestor: requestor || 'Unknown',
      amount: amount || 0,
      currency: currency || 'LSL',
      prLink,
      description: description || (subject ? subject.replace('New Purchase Request for Approval - ', '') : 'No description'),
      department: department || 'Not specified',
      site: site || 'Not specified',
      isUrgent: isUrgent || (subject ? subject.includes('URGENT') : false)
    };
    
    console.log('Generating email with params:', JSON.stringify(emailParams, null, 2));

    // Generate the email content using our template
    const emailContent = await generatePRApprovalEmail(
      emailParams.to,
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
    
    console.log('Generated email content:', JSON.stringify({
      subject: emailContent.subject,
      html: emailContent.html.substring(0, 200) + '...' // Log first 200 chars of HTML
    }, null, 2));
    
    const emailHtml = emailContent.html;

    await sgMail.send({
      from: "noreply@1pwrafrica.com",
      to: to,
      subject: subject || "New Purchase Request for Approval",
      html: emailHtml,
    });

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
  console.log(` Server running on http://localhost:${PORT}`);
});
