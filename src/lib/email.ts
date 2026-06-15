import { Resend } from "resend";
import { gladeEmail, getBaseUrl } from "@/lib/email-templates";

function getResend() {
  const key = process.env.AUTH_RESEND_KEY;
  if (!key) throw new Error("AUTH_RESEND_KEY is not set");
  return new Resend(key);
}

export function isEmailConfigured(): boolean {
  return !!process.env.AUTH_RESEND_KEY;
}

export async function sendPasswordResetEmail(email: string, token: string) {
  const resend = getResend();
  const resetUrl = `${getBaseUrl()}/reset-password?token=${token}`;

  await resend.emails.send({
    from: "Glade <noreply@ourglade.app>",
    to: email,
    subject: "Reset your Glade password",
    html: gladeEmail({
      preview: "Reset your Glade password",
      heading: "Reset your password",
      body: "Someone requested a password reset for your Glade account. Click the button below to choose a new password.",
      cta: { label: "Reset password", url: resetUrl },
      footer: "This link expires in 1 hour. If you didn't request this, you can safely ignore this email.",
    }),
  });
}

export async function sendSpaceInviteEmail(
  email: string,
  spaceName: string,
  inviterName: string,
  inviteToken: string,
  magicLinkUrl?: string,
) {
  const resend = getResend();
  const signUpUrl = `${getBaseUrl()}/sign-up?invite=${inviteToken}`;

  await resend.emails.send({
    from: "Glade <noreply@ourglade.app>",
    to: email,
    subject: `${inviterName} invited you to ${spaceName} on Glade`,
    html: gladeEmail({
      preview: `${inviterName} invited you to ${spaceName}`,
      heading: `You're invited to ${spaceName}`,
      body: `${inviterName} has invited you to join <strong>${spaceName}</strong> on Glade, a governance platform for social purpose organisations.`,
      cta: magicLinkUrl
        ? { label: `Join ${spaceName}`, url: magicLinkUrl }
        : { label: "Create your account", url: signUpUrl },
      secondaryCta: magicLinkUrl
        ? { label: "create an account with a password instead", url: signUpUrl }
        : undefined,
      footer: "This invitation expires in 7 days.",
    }),
  });
}

export async function sendAddedToSpaceEmail(
  email: string,
  spaceName: string,
  inviterName: string,
) {
  const resend = getResend();
  const dashboardUrl = `${getBaseUrl()}/dashboard`;

  await resend.emails.send({
    from: "Glade <noreply@ourglade.app>",
    to: email,
    subject: `You were added to ${spaceName} on Glade`,
    html: gladeEmail({
      preview: `You were added to ${spaceName}`,
      heading: `You've been added to ${spaceName}`,
      body: `${inviterName} has added you to <strong>${spaceName}</strong> on Glade. You can now access this space from your dashboard.`,
      cta: { label: "Go to dashboard", url: dashboardUrl },
    }),
  });
}

export async function sendReviewDigestEmail(
  email: string,
  spaceName: string,
  count: number,
) {
  const resend = getResend();
  const url = `${getBaseUrl()}/dashboard`;
  const noun = count === 1 ? "decision is" : "decisions are";

  await resend.emails.send({
    from: "Glade <noreply@ourglade.app>",
    to: email,
    subject: `${count} ${count === 1 ? "decision" : "decisions"} due for review in ${spaceName}`,
    html: gladeEmail({
      preview: `${count} ${noun} due for review`,
      heading: "Reviews due",
      body: `<strong>${count}</strong> ${noun} due for review in <strong>${spaceName}</strong>. Revisiting decisions keeps your governance record honest — open the dashboard to review them.`,
      cta: { label: "Review decisions", url },
      footer: "You're receiving this because you're a member of this space on Glade.",
    }),
  });
}
