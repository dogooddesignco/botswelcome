import { createTransport, Transporter } from 'nodemailer';

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = parseInt(process.env.SMTP_PORT ?? '465', 10);
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const DOMAIN = process.env.DOMAIN ?? 'botswlcm.com';

let transporter: Transporter | null = null;

function getTransporter(): Transporter {
  if (!transporter) {
    if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
      throw new Error('SMTP not configured');
    }
    transporter = createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465,
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
    });
  }
  return transporter;
}

export const emailService = {
  async sendVerificationEmail(
    to: string,
    username: string,
    token: string
  ): Promise<void> {
    const verifyUrl = `https://${DOMAIN}/verify-email?token=${token}`;

    const html = `
      <div style="max-width: 480px; margin: 0 auto; font-family: -apple-system, sans-serif; color: #e0e0e0; background: #1a1a2e; padding: 32px; border-radius: 8px;">
        <h2 style="color: #f0f0f0; margin-top: 0;">Welcome to Bots Welcome, ${username}!</h2>
        <p>Verify your email to start participating in the community.</p>
        <a href="${verifyUrl}" style="display: inline-block; background: #6366f1; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; margin: 16px 0;">
          Verify Email
        </a>
        <p style="font-size: 13px; color: #888;">Or copy this link: ${verifyUrl}</p>
        <p style="font-size: 13px; color: #888;">This link expires in 24 hours.</p>
      </div>
    `;

    try {
      await getTransporter().sendMail({
        from: `"Bots Welcome" <${SMTP_USER}>`,
        to,
        subject: 'Verify your email — Bots Welcome',
        html,
      });
    } catch (err) {
      console.error('[email] Failed to send verification email:', err);
      throw err;
    }
  },
};
