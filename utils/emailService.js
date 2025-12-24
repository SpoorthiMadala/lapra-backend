import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// ✅ Brevo SMTP transporter
const transporter = nodemailer.createTransport({
  host: 'smtp-relay.brevo.com',
  port: 587,
  secure: false, // STARTTLS
  auth: {
    user: 'apikey',                  // REQUIRED by Brevo
    pass: process.env.EMAIL_PASS,    // Brevo SMTP KEY
  },
  tls: {
    rejectUnauthorized: true,
  },
});

// Verify transporter
transporter.verify((error) => {
  if (error) {
    console.error('❌ Brevo SMTP error:', error.message);
  } else {
    console.log('✅ Brevo SMTP is ready to send emails');
  }
});

export const sendOTPEmail = async (email, name, otp) => {
  try {
    const info = await transporter.sendMail({
      from: 'Lapra-Tech <no-reply@lapratech.com>', // MUST be verified in Brevo
      to: email,
      subject: 'Your OTP for Lapra-Tech Free Access',
      html: `
        <h2>Hello ${name}</h2>
        <p>Your OTP is:</p>
        <h1>${otp}</h1>
        <p>This OTP expires in 2 minutes.</p>
      `,
    });

    console.log('✅ OTP email sent:', info.messageId);
    return info;
  } catch (error) {
    console.error('❌ Error sending OTP email:', error);
    throw new Error('Failed to send OTP email');
  }
};

export default { sendOTPEmail };
