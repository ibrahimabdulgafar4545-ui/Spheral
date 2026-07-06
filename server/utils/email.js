const SibApiV3Sdk = require('@getbrevo/brevo');

const sendEmail = async (toEmail, subject, htmlContent) => {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey || apiKey === 'YOUR_BREVO_API_KEY_HERE') {
    console.log(`[EMAIL DEV MODE] Sent to ${toEmail}: ${subject}`);
    console.log(`[EMAIL CONTENT]\n${htmlContent}`);
    return true;
  }

  const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
  apiInstance.setApiKey(SibApiV3Sdk.TransactionalEmailsApiApiKeys.apiKey, apiKey);

  const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
  sendSmtpEmail.subject = subject;
  sendSmtpEmail.htmlContent = htmlContent;
  sendSmtpEmail.sender = { 
    name: process.env.BREVO_SENDER_NAME || 'Spheral Support', 
    email: process.env.BREVO_SENDER_EMAIL || 'support@spheral.com' 
  };
  sendSmtpEmail.to = [{ email: toEmail }];

  try {
    await apiInstance.sendTransacEmail(sendSmtpEmail);
    return true;
  } catch (error) {
    console.error('Error sending email via Brevo:', error);
    throw error;
  }
};

module.exports = { sendEmail };
