import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { brandedEmail, escapeHtml, sendEmail } from "@/lib/email";
import { createNotification } from "@/lib/notifications";

async function requireCoach() {
  const session = await auth();
  return (session?.user as { role?: string })?.role === "COACH";
}

// GET /api/announcements -coach lists all announcements (for the manage page).
export async function GET() {
  if (!(await requireCoach())) return new Response("Forbidden", { status: 403 });
  return Response.json(
    await prisma.announcement.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        group: { select: { name: true } },
        client: { select: { firstName: true, lastName: true } },
      },
    }),
  );
}

/**
 * POST /api/announcements - create one. Optionally carries a recorded voice
 * note, and can target everyone, one group, or a single client.
 *
 * Body: { message, showUntil, sendEmails?, audioKey?, audioSeconds?, groupId?, clientId? }
 * Emails only go out for broadcasts to everyone - a voice note for one group
 * shouldn't land in every client's inbox.
 */
export async function POST(req: Request) {
  if (!(await requireCoach())) return new Response("Forbidden", { status: 403 });

  const { message, showUntil, sendEmails, audioKey, audioSeconds, groupId, clientId } = await req.json();
  const text = typeof message === "string" ? message.trim() : "";
  if (!showUntil) return new Response("showUntil is required", { status: 400 });
  // A voice note can stand on its own; otherwise there must be something to read.
  if (!text && !audioKey) return new Response("Add a message or record a voice note", { status: 400 });

  const announcement = await prisma.announcement.create({
    data: {
      message: text,
      showUntil: new Date(showUntil),
      audioKey: audioKey || null,
      audioSeconds: typeof audioSeconds === "number" ? Math.round(audioSeconds) : null,
      groupId: groupId || null,
      clientId: clientId || null,
    },
  });

  // Who is this for? Used for the bell, and to scope any emails.
  const audience = clientId
    ? await prisma.user.findMany({ where: { id: clientId }, select: { id: true, email: true } })
    : groupId
      ? await prisma.user.findMany({ where: { groupId, role: "CLIENT" }, select: { id: true, email: true } })
      : await prisma.user.findMany({ where: { role: "CLIENT" }, select: { id: true, email: true } });

  // Bell notification for everyone it's addressed to - a voice note is easy to
  // miss otherwise.
  for (const person of audience) {
    await createNotification(
      person.id,
      "summary",
      audioKey ? "A voice note from me" : "A new note from me",
      "/portal",
    );
  }

  if (sendEmails === true && text) {
    const html = brandedEmail({
      heading: "A note from me",
      bodyHtml: `<p style="margin:0;font-size:15px;line-height:1.6;color:#1a1f36;white-space:pre-line;">${escapeHtml(text)}</p>`,
      footerNote: audioKey ? "There's a voice note waiting in your portal too." : "An announcement from your coach.",
      preheader: text.slice(0, 90),
    });
    await Promise.all(
      audience
        .map((c) => c.email)
        .filter(Boolean)
        .map((to) => sendEmail({ to, subject: "An update from Train with Mills", html })),
    );
  }

  return Response.json(announcement);
}
