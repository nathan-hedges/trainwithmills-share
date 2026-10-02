import { Resend } from "resend";
import { brandedEmail, escapeHtml } from "@/lib/email";
import { rateLimit } from "@/lib/ratelimit";
import { contactSchema } from "@/lib/validation";

export async function POST(req: Request) {
  try {
    const limited = await rateLimit(req, "contact", "strict");
    if (limited) return limited;

    // 1. Unpack + validate the form fields.
    const form = await req.formData();
    const parsed = contactSchema.safeParse({
      name: form.get("name")?.toString(),
      email: form.get("email")?.toString(),
      message: form.get("message")?.toString(),
      goal: form.get("goal")?.toString(),
    });
    if (!parsed.success) {
      return new Response(parsed.error.issues[0]?.message ?? "Invalid submission", { status: 400 });
    }
    const name = parsed.data.name;
    const email = parsed.data.email;
    const message = parsed.data.message || "No message provided";
    const goal = parsed.data.goal || "No goal provided";

    // Don't fail the form if email isn't configured (e.g. local dev with no key).
    if (!process.env.RESEND_API_KEY) {
      console.warn("RESEND_API_KEY not set - skipping contact email send.");
      return new Response("Email not configured", { status: 200 });
    }
    const resend = new Resend(process.env.RESEND_API_KEY);

    // 3. Send the notification to Millie
    const { error: millieError } = await resend.emails.send({
      from: process.env.EMAIL_HELLO!, 
      to: process.env.EMAIL_MILLIE!,
      replyTo: email,
      subject: `New contact form submission from ${name}`,
      html: brandedEmail({
        heading: `New enquiry from ${escapeHtml(name)}`,
        bodyHtml: `
          <table role="presentation" cellpadding="0" cellspacing="0" style="font-size:15px;color:#1a1f36;line-height:1.8;">
            <tr><td style="color:#586079;padding-right:14px;">Name</td><td><strong>${escapeHtml(name)}</strong></td></tr>
            <tr><td style="color:#586079;padding-right:14px;">Email</td><td>${escapeHtml(email)}</td></tr>
            <tr><td style="color:#586079;padding-right:14px;">Goal</td><td>${escapeHtml(goal)}</td></tr>
          </table>
          <p style="margin:16px 0 0;font-size:15px;color:#1a1f36;line-height:1.6;white-space:pre-line;">${escapeHtml(message)}</p>
        `,
        footerNote: "Reply directly to this email to reach them.",
      }),
    });

    if (millieError) {
      console.error("Error sending email to Millie:", millieError);
      return new Response("Error sending notification", { status: 500 });
    }

    // 4. Send the auto-reply back to the Client
    const { error: clientError } = await resend.emails.send({
      from: process.env.EMAIL_HELLO!,
      to: email,
      subject: "Thanks for reaching out",
      html: brandedEmail({
        heading: `Thanks for reaching out, ${escapeHtml(name)}`,
        intro: "I've received your message and will get back to you very soon.",
        bodyHtml: `<p style="margin:0;font-size:15px;color:#586079;line-height:1.6;">In the meantime, have a look around the site to see how training together works.</p>`,
        footerNote: "Millie · Train with Mills",
      }),
    });

    if (clientError) {
      console.error("Error sending confirmation email to client:", clientError);
      // We don't fail the whole request here, because Millie still got the main message!
    }

    // 5. Success!
    return new Response("Emails sent successfully", { status: 200 });

  } catch (error) {
    // This catches major server crashes
    console.error("Server Error:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}