import { Resend } from "resend";

function getResend() {
  const key = process.env.AUTH_RESEND_KEY;
  if (!key) throw new Error("AUTH_RESEND_KEY is not set");
  return new Resend(key);
}

export async function sendPasswordResetEmail(email: string, token: string) {
  const resend = getResend();
  const baseUrl = process.env.NEXTAUTH_URL || process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "http://localhost:3000";

  const resetUrl = `${baseUrl}/reset-password?token=${token}`;

  await resend.emails.send({
    from: "Glade <noreply@ourglade.app>",
    to: email,
    subject: "Reset your Glade password",
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 0;">
        <h2 style="font-size: 20px; font-weight: 500; margin-bottom: 16px;">Reset your password</h2>
        <p style="font-size: 15px; color: #555; line-height: 1.6; margin-bottom: 24px;">
          Someone requested a password reset for your Glade account. Click the button below to choose a new password. This link expires in 1 hour.
        </p>
        <a href="${resetUrl}" style="display: inline-block; background: #2d6a4f; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 500;">
          Reset password
        </a>
        <p style="font-size: 13px; color: #888; margin-top: 24px; line-height: 1.5;">
          If you didn't request this, you can safely ignore this email. Your password won't change.
        </p>
      </div>
    `,
  });
}
