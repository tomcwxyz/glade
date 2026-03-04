interface GladeEmailOptions {
  preview: string;
  heading: string;
  body: string;
  cta: { label: string; url: string };
  secondaryCta?: { label: string; url: string };
  footer?: string;
}

export function gladeEmail({ preview, heading, body, cta, secondaryCta, footer }: GladeEmailOptions): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${heading}</title>
  <!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
</head>
<body style="margin:0;padding:0;background-color:#f5f0eb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <!-- Preview text -->
  <div style="display:none;max-height:0;overflow:hidden;">${preview}</div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f0eb;padding:40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;">
          <!-- Logo -->
          <tr>
            <td style="padding-bottom:32px;text-align:center;">
              <span style="font-family:Georgia,serif;font-size:22px;font-weight:600;color:#3d3428;letter-spacing:-0.02em;">&#127807; Glade</span>
            </td>
          </tr>
          <!-- Card -->
          <tr>
            <td style="background-color:#ffffff;border-radius:12px;padding:40px 36px;">
              <h1 style="margin:0 0 16px;font-family:Georgia,serif;font-size:22px;font-weight:500;color:#3d3428;line-height:1.3;">${heading}</h1>
              <p style="margin:0 0 28px;font-size:15px;line-height:1.6;color:#6b5e50;">${body}</p>
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 0 0;">
                <tr>
                  <td style="border-radius:8px;background-color:#2d6a4f;">
                    <a href="${cta.url}" style="display:inline-block;padding:12px 28px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;">${cta.label}</a>
                  </td>
                </tr>
              </table>
              ${secondaryCta ? `
              <p style="margin:20px 0 0;font-size:13px;color:#6b5e50;">
                Or <a href="${secondaryCta.url}" style="color:#2d6a4f;text-decoration:underline;">${secondaryCta.label}</a>
              </p>` : ""}
              ${footer ? `<p style="margin:28px 0 0;font-size:13px;color:#9b8e80;line-height:1.5;">${footer}</p>` : ""}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding-top:24px;text-align:center;">
              <p style="margin:0;font-size:12px;color:#9b8e80;">Sent by Glade &middot; ourglade.app</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function getBaseUrl(): string {
  // APP_URL is the canonical public URL (set in Vercel env vars)
  if (process.env.APP_URL) return process.env.APP_URL;
  if (process.env.NEXTAUTH_URL) return process.env.NEXTAUTH_URL;
  // VERCEL_URL is deployment-specific (e.g. glade-abc123.vercel.app) — avoid for emails
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}
