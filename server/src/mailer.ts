import nodemailer from 'nodemailer';

export interface MailResult {
  success: boolean;
  code: string;
  previewUrl?: string;
  error?: string;
}

export async function sendVerificationEmail(toEmail: string, code: string, name?: string): Promise<MailResult> {
  const recipientName = name || toEmail.split('@')[0] || 'Candidate';

  console.log(`\n======================================================`);
  console.log(`[AUTH NOTIFICATION] Verification Email Sent`);
  console.log(`[AUTH NOTIFICATION] To: ${toEmail} (${recipientName})`);
  console.log(`[AUTH NOTIFICATION] 6-Digit Code: ${code}`);
  console.log(`======================================================\n`);

  // If real SMTP environment variables are present, dispatch real email
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    try {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587', 10),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });

      await transporter.sendMail({
        from: process.env.SMTP_FROM || '"AI Interview Prep Kit" <noreply@trao.ai>',
        to: toEmail,
        subject: `Your Verification Code: ${code} - AI Interview Prep Kit`,
        text: `Hello ${recipientName},\n\nYour 6-digit verification code is: ${code}\n\nEnter this code to verify your account and access your preparation dashboard.\n\nBest regards,\nAI Interview Prep Team`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
            <h2 style="color: #6366f1; margin-top: 0;">Verify Your Email Address</h2>
            <p style="color: #334155; font-size: 15px;">Hello <strong>${recipientName}</strong>,</p>
            <p style="color: #334155; font-size: 14px; line-height: 1.5;">
              Thank you for registering for the <strong>AI Interview Prep Kit</strong>. Please enter the 6-digit verification code below to activate your account:
            </p>
            <div style="background-color: #f8fafc; border: 2px dashed #6366f1; padding: 18px; text-align: center; border-radius: 8px; margin: 24px 0;">
              <span style="font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #1e1b4b; font-family: monospace;">${code}</span>
            </div>
            <p style="color: #64748b; font-size: 13px;">This code will expire in 24 hours. If you did not create an account, please disregard this email.</p>
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
            <p style="color: #94a3b8; font-size: 11px; text-align: center;">AI Interview Prep Kit • Autonomous Prep Engine</p>
          </div>
        `,
      });
      return { success: true, code };
    } catch (err: any) {
      console.warn('[Mailer] SMTP transport error:', err.message);
      return { success: false, code, error: err.message };
    }
  }

  // Simulated delivery for local dev / preview environments
  return { success: true, code };
}
