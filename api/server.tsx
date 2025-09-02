import "dotenv/config";
import * as React from "react";
import express from "express";
import sendgrid from "@sendgrid/mail";
import { renderAsync } from "@react-email/components";
import { Email } from "./email"; 

const app = express();
app.use(express.json());


if (!process.env.VITE_SENDGRID_API_KEY) {
  throw new Error("SENDGRID_API_KEY is not set");
}
sendgrid.setApiKey(process.env.VITE_SENDGRID_API_KEY);

app.post("/api/send-email", async (req, res) => {
  try {
    const { to } = req.body;

    // Render React Email template
    const emailHtml = await renderAsync(<Email/>);

    await sendgrid.send({
      from: "sendgrid@1pwrafrica.com",
      to: 'bokangleqele7@gmail.com',
      subject: "PR Email Test",
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
