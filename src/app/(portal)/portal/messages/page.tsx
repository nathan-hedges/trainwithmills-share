import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { canSendFormVideos } from "@/lib/nutrition/plan";
import { PageHeading } from "@/components/portal/primitives";
import { MessageThread } from "@/components/portal/messages/MessageThread";

export default async function ClientMessagesPage() {
  const email = (await auth())?.user?.email?.toLowerCase();
  const me = email ? await prisma.user.findUnique({ where: { email }, select: { plan: true } }) : null;
  const canVideo = canSendFormVideos(me?.plan);

  return (
    <div className="space-y-6">
      <PageHeading
        title="Messages"
        subtitle={
          canVideo
            ? "Chat with me and send footage for form checks."
            : "Chat with me for support and guidance."
        }
      />
      <MessageThread canSendVideo={canVideo} />
    </div>
  );
}
