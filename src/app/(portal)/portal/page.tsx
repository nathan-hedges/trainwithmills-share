import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Eye, PhoneCall, Sparkles } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { fullName } from "@/lib/portal/types";
import { Card } from "@/components/portal/primitives";
import { ClientToday } from "@/components/portal/client/ClientToday";
import { spotifyUrl } from "@/lib/settings";

const viewerFields = { id: true, firstName: true, lastName: true, email: true, plan: true } as const;

function fmtToday() {
  return new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
}

export default async function ClientTodayPage({
  searchParams,
}: {
  searchParams: Promise<{ preview?: string }>;
}) {
  const session = await auth();
  const role = (session?.user as { role?: string })?.role;
  const { preview } = await searchParams;
  const previewing = !!preview && role === "COACH";

  // /portal is the CLIENT area: a coach landing here without a preview (the PWA
  // start_url, or a "Back to portal" link) belongs on her own dashboard. With
  // ?preview= she's deliberately looking at a client's view, so let her through.
  if (role === "COACH" && !previewing) redirect("/admin");

  const viewer =
    previewing && preview
      ? await prisma.user.findUnique({ where: { id: preview }, select: viewerFields })
      : session?.user?.email
        ? await prisma.user.findUnique({
            where: { email: session.user.email.toLowerCase() },
            select: viewerFields,
          })
        : null;

  if (!viewer) {
    return (
      <Card className="mx-auto max-w-3xl p-8 text-center">
        <p className="text-muted">We couldn&apos;t load this profile.</p>
        {previewing && (
          <Link href="/admin" className="mt-2 inline-block font-semibold text-royal-700">
            Back to dashboard
          </Link>
        )}
      </Card>
    );
  }

  const firstName = viewer.firstName || "there";

  // A brand-new client has nothing assigned yet — greet them instead of showing
  // a wall of "Rest day" cards.
  const isNew = (await prisma.workout.count({ where: { clientId: viewer.id } })) === 0;

  // Millie's playlist, if she's set one - a nice-to-have, never in the way.
  const spotify = await spotifyUrl();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {previewing && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-royal-200 bg-royal-50 px-4 py-3">
          <span className="inline-flex items-center gap-2 text-sm font-medium text-royal-800">
            <Eye className="h-4 w-4" />
            Previewing {fullName(viewer)}&apos;s portal
          </span>
          <Link
            href={`/admin/clients/${viewer.id}`}
            className="inline-flex items-center gap-1.5 rounded-full border border-royal-300 bg-white px-3 py-1.5 text-sm font-medium text-royal-700 transition-colors hover:bg-royal-100"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to coaching
          </Link>
        </div>
      )}

      <div>
        <p className="text-sm font-medium text-royal-600">{fmtToday()}</p>
        <h1 className="mt-1 font-display text-3xl tracking-tight sm:text-4xl">
          {isNew ? "Welcome" : "Welcome back"}, {firstName}.
        </h1>
      </div>

      {isNew ? (
        <Card className="flex flex-col items-center gap-4 p-10 text-center sm:p-14">
          <div className="grid h-16 w-16 place-items-center rounded-2xl bg-royal-50 text-royal-600">
            <Sparkles className="h-8 w-8" />
          </div>
          <h2 className="font-display text-2xl">You&apos;re all set up, {firstName}!</h2>
          <p className="max-w-sm text-muted">
            I&apos;m putting your training plan together - it&apos;ll appear right here soon. Check back shortly.
          </p>
        </Card>
      ) : (
        <ClientToday
          previewClientId={previewing ? viewer.id : undefined}
          spotifyUrl={spotify}
        />
      )}

      {/* Your Strong Era perk: the optional monthly review call. */}
      {viewer.plan?.toLowerCase().includes("strong era") && (
        <Card className="flex flex-wrap items-center gap-4 p-5">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gold-100 text-gold-600">
            <PhoneCall className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="font-medium text-ink">Your monthly review call</h2>
            <p className="text-sm text-muted">
              Part of your plan - message me whenever you&apos;d like to arrange a time that suits you.
            </p>
          </div>
          <Link
            href="/portal/messages"
            className="inline-flex shrink-0 items-center rounded-full bg-royal-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-royal-700"
          >
            Arrange a call
          </Link>
        </Card>
      )}
    </div>
  );
}
