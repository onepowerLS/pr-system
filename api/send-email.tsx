
// import { render } from "@react-email/components";
// import sendgrid from "@sendgrid/mail";
// import { Email } from "./email";

// sendgrid.setApiKey(process.env.VITE_SENDGRID_API_KEY || "");

// export default async function handler(req: any, res: any) {
//   if (req.method !== "POST") {
//     return res.status(405).json({ error: "Method not allowed" });
//   }

//   try {
//     // Generate HTML from React component
//     const emailHtml = await render(<Email />);

//     // Send email via SendGrid
//     await sendgrid.send({
//       from: "sendgrid@1pwrafrica.com", 
//       to: "bokangleqele7@gmail.com",
//       subject: "PR Email Test",
//       html: emailHtml,
//     });

//     return res.status(200).json({ success: true });
//   }catch (error: unknown) {
//   console.error("SendGrid error:", error);

//   if (error instanceof Error) {
//     console.error("Error message:", error.message);
//     console.error("Error stack:", error.stack);
//   } else {
//     console.error("Error (unknown type):", error);
//   }

//   res.status(500).json({ success: false, error: "Failed to send email" });
// }

// }
