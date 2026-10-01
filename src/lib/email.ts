import nodemailer from 'nodemailer';

const getTransport = () => {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user,
      pass,
    },
  });
};

export async function sendPasswordResetEmail(email: string, token: string) {
  const baseUrl = process.env.APP_URL || 'http://localhost:3000';
  const resetUrl = `${baseUrl}/reset-password?token=${encodeURIComponent(token)}`;

  const transport = getTransport();

  if (!transport) {
    console.log('Password reset email not sent because SMTP is not configured.');
    console.log('Reset URL:', resetUrl);
    return { skipped: true, resetUrl };
  }

  await transport.sendMail({
    from: process.env.EMAIL_FROM || process.env.SMTP_USER,
    to: email,
    subject: 'Reset your LegalSync password',
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #10233f;">
        <h2 style="margin-bottom: 12px;">Reset your password</h2>
        <p>We received a request to reset the password for your LegalSync account.</p>
        <p>
          <a href="${resetUrl}" style="display: inline-block; background: #10233f; color: #ffffff; text-decoration: none; padding: 12px 18px; border-radius: 8px; margin-top: 8px;">
            Reset Password
          </a>
        </p>
        <p>If you did not request this, you can ignore this email.</p>
        <p>This link will expire in 1 hour.</p>
      </div>
    `,
    text: `Reset your LegalSync password: ${resetUrl}`,
  });

  return { skipped: false, resetUrl };
}

export async function sendVerificationEmail(email: string, token: string) {
  const baseUrl = process.env.APP_URL || 'http://localhost:3000';
  const verifyUrl = `${baseUrl}/verify-email?token=${encodeURIComponent(token)}`;

  const transport = getTransport();

  if (!transport) {
    console.log('Verification email not sent because SMTP is not configured.');
    console.log('Verify URL:', verifyUrl);
    return { skipped: true, verifyUrl };
  }

  await transport.sendMail({
    from: process.env.EMAIL_FROM || process.env.SMTP_USER,
    to: email,
    subject: 'Verify your LegalSync email',
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #10233f;">
        <h2 style="margin-bottom: 12px;">Welcome to LegalSync</h2>
        <p>Please confirm your email address to activate your account.</p>
        <p>
          <a href="${verifyUrl}" style="display: inline-block; background: #10233f; color: #ffffff; text-decoration: none; padding: 12px 18px; border-radius: 8px; margin-top: 8px;">
            Verify Email
          </a>
        </p>
        <p>If you did not create an account, you can ignore this email.</p>
        <p>This link will expire in 24 hours.</p>
      </div>
    `,
    text: `Verify your LegalSync email: ${verifyUrl}`,
  });

  return { skipped: false, verifyUrl };
}
