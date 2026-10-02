import { Resend } from "resend";

/**
 * Branded HTML email layout for all auto-sent emails. Email clients need
 * inline styles + table layout, so this is deliberately not Tailwind.
 * Palette mirrors the site: deep royal header, gold accent, soft paper bg.
 */
interface EmailOpts {
  heading: string;
  intro?: string;
  /** Raw inner HTML (already escaped/trusted) inserted after the intro. */
  bodyHtml?: string;
  button?: { label: string; url: string };
  footerNote?: string;
  preheader?: string;
}

export function brandedEmail({ heading, intro, bodyHtml, button, footerNote, preheader }: EmailOpts): string {
  const btn = button
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:8px;"><tr><td>
         <a href="${button.url}" style="display:inline-block;background:#2f43d8;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:13px 26px;border-radius:999px;">${button.label}</a>
       </td></tr></table>`
    : "";

  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f6fb;font-family:Helvetica,Arial,sans-serif;color:#1a1f36;">
  ${preheader ? `<span style="display:none;max-height:0;overflow:hidden;opacity:0;color:#f4f6fb;">${preheader}</span>` : ""}
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6fb;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#ffffff;border-radius:18px;overflow:hidden;border:1px solid #e8eaf4;">
        <tr><td style="background:#1f2c6e;padding:22px 32px;">
          <span style="font-size:20px;font-weight:700;letter-spacing:0.4px;color:#ffffff;">Train with <span style="color:#d8b25a;">Mills</span></span>
        </td></tr>
        <tr><td style="padding:32px;">
          <h1 style="margin:0 0 12px;font-size:22px;line-height:1.3;color:#1a1f36;">${heading}</h1>
          ${intro ? `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#586079;">${intro}</p>` : ""}
          ${bodyHtml ?? ""}
          ${btn}
        </td></tr>
        <tr><td style="padding:18px 32px;border-top:1px solid #e8eaf4;">
          <p style="margin:0;font-size:12px;line-height:1.6;color:#9aa1b8;">${footerNote ?? "You're receiving this because you train with Mills."}<br/>Train with Mills &middot; trainwithmills.co.uk</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

/** Low-level send. No-ops (logs) when RESEND_API_KEY isn't set, like your other routes. */
export async function sendEmail({
  to,
  subject,
  html,
  replyTo,
}: {
  to: string | string[];
  subject: string;
  html: string;
  replyTo?: string;
}): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    console.warn("RESEND_API_KEY not set - skipping email send.");
    return;
  }
  const resend = new Resend(process.env.RESEND_API_KEY);
  try {
    await resend.emails.send({ from: process.env.EMAIL_HELLO!, to, subject, html, replyTo });
  } catch (err) {
    console.error("Email failed to send:", err);
  }
}

/** Escape user-entered text before inserting it into email HTML. */
export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const appUrl = () => process.env.APP_URL ?? "https://trainwithmills.co.uk";

/**
 * Sends a branded email for a notification. Call this from your own
 * notification code (you keep that logic) - it only does Resend + the email.
 */
export async function sendNotificationEmail(to: string, title: string, link?: string): Promise<void> {
  const html = brandedEmail({
    heading: title,
    preheader: title,
    button: link ? { label: "Open in your portal", url: `${appUrl()}${link}` } : undefined,
    footerNote: "Manage which emails you get in your portal settings.",
  });
  await sendEmail({ to, subject: title, html });
}
