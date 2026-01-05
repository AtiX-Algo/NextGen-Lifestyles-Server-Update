// server/utils/sendEmail.js
const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail', // Built-in support for Gmail
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS, // Your App Password
      },
    });

    // Define email options
    const mailOptions = {
      from: `"NextGen Support" <${process.env.EMAIL_USER}>`, // Sender address
      to: options.email,
      subject: options.subject,
      text: options.message, // Plain text body
      html: options.html,    // HTML body (optional but looks better)
    };

    // Send email
    const info = await transporter.sendMail(mailOptions);
    console.log("✅ Email sent: %s", info.messageId);
    return true;

  } catch (error) {
    console.error("❌ Email Error:", error);
    return false;
  }
};

module.exports = sendEmail;