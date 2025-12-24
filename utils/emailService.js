import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// Create transporter
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
    }
});

// Verify transporter configuration
transporter.verify((error, success) => {
    if (error) {
        console.error('Email service error:', error);
    } else {
        console.log('✅ Email service is ready to send messages');
    }
});

/**
 * Send OTP email to user
 * @param {string} email - Recipient email address
 * @param {string} name - Recipient name
 * @param {string} otp - 6-digit OTP code
 */
export const sendOTPEmail = async (email, name, otp) => {
    const mailOptions = {
        from: {
            name: 'Lapra-Tech',
            address: process.env.EMAIL_USER
        },
        to: email,
        subject: 'Your OTP for Lapra-Tech Free Access',
        html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body {
            margin: 0;
            padding: 0;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          }
          .container {
            max-width: 600px;
            margin: 40px auto;
            background: white;
            border-radius: 20px;
            overflow: hidden;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
          }
          .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 40px 20px;
            text-align: center;
          }
          .header h1 {
            color: white;
            margin: 0;
            font-size: 32px;
            font-weight: 700;
          }
          .content {
            padding: 40px 30px;
            text-align: center;
          }
          .greeting {
            font-size: 20px;
            color: #333;
            margin-bottom: 20px;
          }
          .message {
            font-size: 16px;
            color: #666;
            line-height: 1.6;
            margin-bottom: 30px;
          }
          .otp-box {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border-radius: 15px;
            padding: 30px;
            margin: 30px 0;
          }
          .otp-code {
            font-size: 48px;
            font-weight: 700;
            color: white;
            letter-spacing: 8px;
            margin: 0;
            font-family: 'Courier New', monospace;
          }
          .otp-label {
            color: rgba(255, 255, 255, 0.9);
            font-size: 14px;
            margin-top: 10px;
          }
          .warning {
            background: #fff3cd;
            border-left: 4px solid #ffc107;
            padding: 15px;
            margin: 20px 0;
            text-align: left;
            border-radius: 5px;
          }
          .warning p {
            margin: 0;
            color: #856404;
            font-size: 14px;
          }
          .footer {
            background: #f8f9fa;
            padding: 20px;
            text-align: center;
            color: #666;
            font-size: 14px;
          }
          .footer p {
            margin: 5px 0;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Lapra-Tech</h1>
          </div>
          <div class="content">
            <p class="greeting">Hello ${name}!</p>
            <p class="message">
              Thank you for claiming your free access to Lapra-Tech! You're one step away from joining our exclusive community.
            </p>
            <div class="otp-box">
              <p class="otp-code">${otp}</p>
              <p class="otp-label">Your One-Time Password</p>
            </div>
            <div class="warning">
              <p><strong>Important:</strong> This OTP will expire in 2 minutes. Please verify your account soon!</p>
            </div>
            <p class="message">
              Enter this code on the verification page to complete your registration.
            </p>
          </div>
          <div class="footer">
            <p><strong>Lapra-Tech</strong></p>
            <p>If you didn't request this code, please ignore this email.</p>
            <p style="margin-top: 15px; color: #999; font-size: 12px;">
              This is an automated email. Please do not reply.
            </p>
          </div>
        </div>
      </body>
      </html>
    `
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('✅ OTP email sent successfully:', info.messageId);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('❌ Error sending OTP email:', error);
        throw new Error('Failed to send OTP email');
    }
};

export default { sendOTPEmail };
