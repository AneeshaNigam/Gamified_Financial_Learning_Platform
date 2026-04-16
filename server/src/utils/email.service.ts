import { env } from '../config/env';

interface EmailOptions {
  to: string;
  subject: string;
  text: string;
  html: string;
}

const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';

export const sendEmail = async (options: EmailOptions): Promise<boolean> => {
  const apiKey = env.BREVO_API_KEY;

  if (!apiKey) {
    // Development fallback — log to console
    console.log('\n================================= EMAIL (Dev Mode)');
    console.log(`To: ${options.to}`);
    console.log(`Subject: ${options.subject}`);
    console.log(`\n${options.text}\n`);
    console.log('=================================\n');
    return true;
  }

  try {
    console.log('Sending email via Brevo HTTP API to:', options.to);

    const response = await fetch(BREVO_API_URL, {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': apiKey,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        sender: {
          name: 'MoneyMaster',
          email: 'finnlearnofficial@gmail.com'
        },
        to: [{ email: options.to }],
        subject: options.subject,
        textContent: options.text,
        htmlContent: options.html
      })
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('Brevo API error:', response.status, errorBody);
      return false;
    }

    const result = await response.json() as { messageId?: string };
    console.log('Email sent successfully. Message ID:', result.messageId);
    return true;
  } catch (error) {
    console.error('Email sending failed:', error instanceof Error ? error.message : error);
    return false;
  }
};

export const sendPasswordResetEmail = async (
  email: string,
  resetToken: string,
  userName: string
): Promise<boolean> => {
  const resetUrl = `${env.CLIENT_URL || 'http://localhost:5173'}/reset-password/${resetToken}`;
  
  const text = `Hi ${userName},

You requested to reset your password for your MoneyMaster account.

Click the link below to reset your password (valid for 10 minutes):
${resetUrl}

If you didn't request this, please ignore this email.

Best regards,
MoneyMaster Team`;

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Reset Your Password - MoneyMaster</title>
    </head>
    <body style="margin: 0; padding: 0; background: linear-gradient(135deg, hsl(210 100% 56%) 0%, hsl(200 90% 50%) 100%); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
      <table role="presentation" cellpadding="0" cellspacing="0" style="width: 100%; padding: 60px 20px;">
        <tr>
          <td align="center">
            
            <!-- Stacked Cards Container -->
            <div style="position: relative; max-width: 600px; width: 100%; margin: 0 auto;">
              
              <!-- Stack Layer 3 (Bottom) -->
              <div style="position: absolute; top: -12px; left: 50%; transform: translateX(-50%); width: 92%; height: 100%; background: rgba(255, 255, 255, 0.12); border-radius: 12px; backdrop-filter: blur(8px);"></div>
              
              <!-- Stack Layer 2 (Middle) -->
              <div style="position: absolute; top: -6px; left: 50%; transform: translateX(-50%); width: 96%; height: 100%; background: rgba(255, 255, 255, 0.18); border-radius: 12px; backdrop-filter: blur(10px);"></div>
              
              <!-- Main Card (Top) -->
              <table role="presentation" cellpadding="0" cellspacing="0" style="position: relative; max-width: 600px; width: 100%; background: hsl(0 0% 100%); border-radius: 12px; box-shadow: 0 8px 24px rgba(30, 144, 255, 0.2), 0 4px 12px rgba(30, 144, 255, 0.15); overflow: hidden; border: 1px solid rgba(255, 255, 255, 0.8);">
                
                <!-- Header Section -->
                <tr>
                  <td style="padding: 48px 48px 32px 48px; text-align: center; background: linear-gradient(135deg, hsl(210 100% 56%) 0%, hsl(200 90% 50%) 100%);">
                    <h1 style="margin: 0; font-size: 28px; font-weight: 700; color: hsl(0 0% 100%); letter-spacing: -0.02em;">
                      MoneyMaster
                    </h1>
                    <p style="margin: 8px 0 0 0; font-size: 14px; color: rgba(255, 255, 255, 0.9); font-weight: 500;">
                      Financial Learning Platform
                    </p>
                  </td>
                </tr>

                <!-- Main Content -->
                <tr>
                  <td style="padding: 48px 48px 40px 48px;">
                    
                    <!-- Title -->
                    <h2 style="margin: 0 0 16px 0; font-size: 26px; font-weight: 700; color: hsl(220 40% 15%); letter-spacing: -0.02em; line-height: 1.3;">
                      Password Reset Request
                    </h2>
                    
                    <!-- Description -->
                    <p style="margin: 0 0 24px 0; font-size: 16px; color: hsl(215 20% 45%); line-height: 1.6;">
                      Hello <strong style="color: hsl(220 40% 15%); font-weight: 600;">${userName}</strong>,
                    </p>
                    
                    <p style="margin: 0 0 32px 0; font-size: 16px; color: hsl(215 20% 45%); line-height: 1.6;">
                      We received a request to reset your password. Click the button below to create a new password for your account.
                    </p>

                    <!-- CTA Button -->
                    <table role="presentation" cellpadding="0" cellspacing="0" style="width: 100%; margin: 0 0 32px 0;">
                      <tr>
                        <td align="center">
                          <a href="${resetUrl}" 
                             style="display: inline-block; 
                                    background: linear-gradient(135deg, hsl(210 100% 56%) 0%, hsl(200 90% 50%) 100%);
                                    color: hsl(0 0% 100%); 
                                    text-decoration: none; 
                                    padding: 16px 40px; 
                                    border-radius: 8px; 
                                    font-size: 16px; 
                                    font-weight: 600; 
                                    letter-spacing: -0.01em;
                                    box-shadow: 0 4px 12px rgba(30, 144, 255, 0.3), 0 2px 8px rgba(30, 144, 255, 0.2);">
                            Reset Password
                          </a>
                        </td>
                      </tr>
                    </table>

                    <!-- Info Box -->
                    <div style="background: hsl(210 40% 95%); border-left: 3px solid hsl(210 100% 56%); border-radius: 8px; padding: 16px 20px; margin: 0 0 32px 0;">
                      <p style="margin: 0; font-size: 14px; color: hsl(220 40% 15%); line-height: 1.5;">
                        <strong style="font-weight: 600;">Link expires in 10 minutes</strong> for security reasons.
                      </p>
                    </div>

                    <!-- Divider -->
                    <div style="height: 1px; background: linear-gradient(90deg, transparent 0%, hsl(210 30% 88%) 20%, hsl(210 30% 88%) 80%, transparent 100%); margin: 0 0 32px 0;"></div>

                    <!-- Alternative Link -->
                    <div style="margin: 0 0 32px 0;">
                      <p style="margin: 0 0 12px 0; font-size: 13px; color: hsl(215 20% 45%); font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">
                        Or copy this link
                      </p>
                      <div style="background: hsl(210 40% 95%); border: 1px solid hsl(210 30% 88%); border-radius: 8px; padding: 16px;">
                        <p style="margin: 0; font-size: 13px; color: hsl(210 100% 56%); word-break: break-all; line-height: 1.6; font-family: 'Courier New', monospace;">
                          ${resetUrl}
                        </p>
                      </div>
                    </div>

                    <!-- Security Notice -->
                    <div style="background: linear-gradient(135deg, hsl(175 70% 97%) 0%, hsl(175 70% 95%) 100%); border-left: 3px solid hsl(175 70% 45%); border-radius: 8px; padding: 20px;">
                      <p style="margin: 0 0 8px 0; font-size: 14px; color: hsl(175 70% 20%); font-weight: 700; line-height: 1.4;">
                        Security Notice
                      </p>
                      <p style="margin: 0; font-size: 14px; color: hsl(175 70% 25%); line-height: 1.6;">
                        If you didn't request this password reset, you can safely ignore this email. Your account remains secure.
                      </p>
                    </div>

                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="background: hsl(210 40% 95%); padding: 32px 48px; border-top: 1px solid hsl(210 30% 88%);">
                    <table role="presentation" cellpadding="0" cellspacing="0" style="width: 100%;">
                      <tr>
                        <td>
                          <p style="margin: 0 0 8px 0; font-size: 14px; color: hsl(220 40% 15%); font-weight: 600;">
                            MoneyMaster Team
                          </p>
                          <p style="margin: 0; font-size: 13px; color: hsl(215 20% 45%); line-height: 1.5;">
                            Empowering financial literacy through gamified learning
                          </p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding-top: 20px;">
                          <div style="height: 1px; background: hsl(210 30% 88%); margin-bottom: 16px;"></div>
                          <p style="margin: 0; font-size: 12px; color: hsl(215 20% 55%); line-height: 1.5;">
                            © 2026 MoneyMaster. All rights reserved.
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </div>

            <!-- Bottom Notice -->
            <table role="presentation" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%; margin-top: 24px;">
              <tr>
                <td style="text-align: center;">
                  <p style="margin: 0; font-size: 12px; color: rgba(255, 255, 255, 0.95); line-height: 1.5; text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);">
                    This is an automated message. Please do not reply to this email.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject: 'Reset Your Password - MoneyMaster',
    text,
    html
  });
};

export const sendOtpEmail = async (
  email: string,
  otp: string,
  userName: string,
  flow: 'login' | 'signup' = 'login'
): Promise<boolean> => {
  const actionLabel = flow === 'signup' ? 'verify your email address' : 'complete your login';
  const titleLabel  = flow === 'signup' ? 'Verify Your Email' : 'Login Verification';

  // Add a timestamp so the user can identify the latest email in their inbox
  const now = new Date();
  const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'UTC' }) + ' UTC';

  const text = `Hi ${userName},\n\nYour MoneyMaster verification code is: ${otp}\n\nThis code expires in 10 minutes. If you have multiple emails from us, please use THIS one (sent at ${timeStr}) and discard the others.\n\nIf you did not request this, please ignore this email.\n\nMoneyMaster Team`;


  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${titleLabel} - MoneyMaster</title>
    </head>
    <body style="margin: 0; padding: 0; background: linear-gradient(135deg, hsl(210 100% 56%) 0%, hsl(200 90% 50%) 100%); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
      <table role="presentation" cellpadding="0" cellspacing="0" style="width: 100%; padding: 60px 20px;">
        <tr>
          <td align="center">
            <div style="position: relative; max-width: 600px; width: 100%; margin: 0 auto;">
              <!-- Stack Layer 3 (Bottom) -->
              <div style="position: absolute; top: -12px; left: 50%; transform: translateX(-50%); width: 92%; height: 100%; background: rgba(255, 255, 255, 0.12); border-radius: 12px; backdrop-filter: blur(8px);"></div>
              <!-- Stack Layer 2 (Middle) -->
              <div style="position: absolute; top: -6px; left: 50%; transform: translateX(-50%); width: 96%; height: 100%; background: rgba(255, 255, 255, 0.18); border-radius: 12px; backdrop-filter: blur(10px);"></div>
              <!-- Main Card -->
              <table role="presentation" cellpadding="0" cellspacing="0" style="position: relative; max-width: 600px; width: 100%; background: hsl(0 0% 100%); border-radius: 12px; box-shadow: 0 8px 24px rgba(30, 144, 255, 0.2), 0 4px 12px rgba(30, 144, 255, 0.15); overflow: hidden; border: 1px solid rgba(255, 255, 255, 0.8);">
                <!-- Header -->
                <tr>
                  <td style="padding: 48px 48px 32px 48px; text-align: center; background: linear-gradient(135deg, hsl(210 100% 56%) 0%, hsl(200 90% 50%) 100%);">
                    <h1 style="margin: 0; font-size: 28px; font-weight: 700; color: hsl(0 0% 100%); letter-spacing: -0.02em;">MoneyMaster</h1>
                    <p style="margin: 8px 0 0 0; font-size: 14px; color: rgba(255, 255, 255, 0.9); font-weight: 500;">Financial Learning Platform</p>
                  </td>
                </tr>
                <!-- Content -->
                <tr>
                  <td style="padding: 48px 48px 40px 48px;">
                    <h2 style="margin: 0 0 16px 0; font-size: 26px; font-weight: 700; color: hsl(220 40% 15%); letter-spacing: -0.02em; line-height: 1.3;">${titleLabel}</h2>
                    <p style="margin: 0 0 8px 0; font-size: 16px; color: hsl(215 20% 45%); line-height: 1.6;">
                      Hello <strong style="color: hsl(220 40% 15%); font-weight: 600;">${userName}</strong>,
                    </p>
                    <p style="margin: 0 0 36px 0; font-size: 16px; color: hsl(215 20% 45%); line-height: 1.6;">
                      Use the code below to ${actionLabel}. It expires in <strong style="color: hsl(220 40% 15%);">10 minutes</strong>.
                    </p>

                    <!-- OTP Code Block -->
                    <table role="presentation" cellpadding="0" cellspacing="0" style="width: 100%; margin: 0 0 36px 0;">
                      <tr>
                        <td align="center">
                          <div style="display: inline-block; background: linear-gradient(135deg, hsl(210 100% 56%) 0%, hsl(200 90% 50%) 100%); border-radius: 12px; padding: 3px;">
                            <div style="background: hsl(0 0% 100%); border-radius: 10px; padding: 28px 48px;">
                              <p style="margin: 0 0 6px 0; font-size: 11px; font-weight: 700; color: hsl(215 20% 55%); text-transform: uppercase; letter-spacing: 0.12em;">Verification Code</p>
                              <p style="margin: 0; font-size: 42px; font-weight: 800; color: hsl(210 100% 45%); letter-spacing: 0.18em; font-family: 'Courier New', monospace;">${otp}</p>
                            </div>
                          </div>
                        </td>
                      </tr>
                    </table>

                    <!-- Expiry Info -->
                    <div style="background: hsl(210 40% 95%); border-left: 3px solid hsl(210 100% 56%); border-radius: 8px; padding: 16px 20px; margin: 0 0 32px 0;">
                      <p style="margin: 0; font-size: 14px; color: hsl(220 40% 15%); line-height: 1.5;">
                        <strong style="font-weight: 600;">Do not share this code</strong> with anyone. MoneyMaster will never ask for your code.
                      </p>
                    </div>

                    <!-- Divider -->
                    <div style="height: 1px; background: linear-gradient(90deg, transparent 0%, hsl(210 30% 88%) 20%, hsl(210 30% 88%) 80%, transparent 100%); margin: 0 0 32px 0;"></div>

                    <!-- Security Notice -->
                    <div style="background: linear-gradient(135deg, hsl(175 70% 97%) 0%, hsl(175 70% 95%) 100%); border-left: 3px solid hsl(175 70% 45%); border-radius: 8px; padding: 20px;">
                      <p style="margin: 0 0 8px 0; font-size: 14px; color: hsl(175 70% 20%); font-weight: 700; line-height: 1.4;">Security Notice</p>
                      <p style="margin: 0; font-size: 14px; color: hsl(175 70% 25%); line-height: 1.6;">
                        If you did not request this code, please ignore this email. Your account remains secure.
                      </p>
                    </div>
                  </td>
                </tr>
                <!-- Footer -->
                <tr>
                  <td style="background: hsl(210 40% 95%); padding: 32px 48px; border-top: 1px solid hsl(210 30% 88%);">
                    <p style="margin: 0 0 8px 0; font-size: 14px; color: hsl(220 40% 15%); font-weight: 600;">MoneyMaster Team</p>
                    <p style="margin: 0 0 20px 0; font-size: 13px; color: hsl(215 20% 45%); line-height: 1.5;">Empowering financial literacy through gamified learning</p>
                    <div style="height: 1px; background: hsl(210 30% 88%); margin-bottom: 16px;"></div>
                    <p style="margin: 0; font-size: 12px; color: hsl(215 20% 55%);">© 2026 MoneyMaster. All rights reserved.</p>
                  </td>
                </tr>
              </table>
            </div>
            <!-- Bottom Notice -->
            <table role="presentation" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%; margin-top: 24px;">
              <tr>
                <td style="text-align: center;">
                  <p style="margin: 0; font-size: 12px; color: rgba(255, 255, 255, 0.95); line-height: 1.5; text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);">
                    This is an automated message. Please do not reply to this email.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject: `${titleLabel} - MoneyMaster (sent at ${timeStr})`,
    text,
    html
  });
};

