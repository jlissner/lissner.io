const { SESClient, SendEmailCommand } = require('@aws-sdk/client-ses');

const ses = new SESClient({ region: process.env.AWS_SES_REGION });

const sendMagicLinkEmail = async (email, magicLink) => {
  
  const emailParams = {
    Source: process.env.AWS_SES_FROM_EMAIL,
    Destination: {
      ToAddresses: [email],
    },
    Message: {
      Subject: {
        Data: 'Your Lissner Family Photos Magic Link',
      },
      Body: {
        Html: {
          Data: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #2563eb; margin: 0;">📸 Lissner Family Photos</h1>
              </div>
              
              <div style="background-color: #f8fafc; padding: 30px; border-radius: 8px; margin-bottom: 30px;">
                <h2 style="color: #1e293b; margin-top: 0;">Welcome back!</h2>
                <p style="color: #475569; font-size: 16px; line-height: 1.5;">
                  Click the button below to securely access your family photo collection.
                </p>
                
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${magicLink}" 
                     style="background-color: #2563eb; color: white; padding: 16px 32px; 
                            text-decoration: none; border-radius: 8px; display: inline-block;
                            font-weight: 600; font-size: 16px; text-align: center;">
                    Access Family Photos →
                  </a>
                </div>
                
                <p style="color: #64748b; font-size: 14px; margin-bottom: 0;">
                  Or copy and paste this link into your browser:<br>
                  <span style="word-break: break-all; color: #2563eb;">${magicLink}</span>
                </p>
              </div>
              
              <div style="border-top: 1px solid #e2e8f0; padding-top: 20px;">
                <p style="color: #64748b; font-size: 14px; margin: 0 0 10px 0;">
                  🔒 This link will expire in 15 minutes for your security.
                </p>
                <p style="color: #64748b; font-size: 14px; margin: 0;">
                  If you didn't request this link, you can safely ignore this email.
                </p>
              </div>
              
              <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
                <p style="color: #94a3b8; font-size: 12px; margin: 0;">
                  Lissner Family Photos • Private Family Collection
                </p>
              </div>
            </div>
          `,
        },
        Text: {
          Data: `
Welcome to Lissner Family Photos!

Click this link to access your family photo collection:
${magicLink}

This link will expire in 15 minutes for security reasons.

If you didn't request this, please ignore this email.

---
Lissner Family Photos
Private Family Collection
          `,
        },
      },
    },
  };
  
  if (!emailParams.Source) {
    throw new Error('AWS_SES_FROM_EMAIL environment variable is required');
  }
  
  const command = new SendEmailCommand(emailParams);
  
  try {
    const result = await ses.send(command);
    return result;
  } catch (error) {
    console.error('Failed to send email:', error.message);
    throw error;
  }
};

module.exports = {
  sendMagicLinkEmail,
}; 