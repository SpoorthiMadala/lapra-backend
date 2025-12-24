import SibApiV3Sdk from 'sib-api-v3-sdk';

const client = SibApiV3Sdk.ApiClient.instance;
client.authentications['api-key'].apiKey = process.env.BREVO_API_KEY;

const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();

export const sendOTPEmail = async (email, name, otp) => {
  try {
    await apiInstance.sendTransacEmail({
      subject: 'Your OTP for Lapra-Tech',
      htmlContent: `
        <h2>Hello ${name}</h2>
        <p>Your OTP is:</p>
        <h1>${otp}</h1>
        <p>This OTP expires in 10 minutes.</p>
      `,
      sender: { name: 'Lapra-Tech', email: 'no-reply@lapratech.com' },
      to: [{ email }],
    });

    console.log('✅ OTP email sent via Brevo API');
  } catch (err) {
    console.error('❌ Brevo API error:', err.response?.body || err.message);
    throw new Error('Failed to send OTP email');
  }
};
