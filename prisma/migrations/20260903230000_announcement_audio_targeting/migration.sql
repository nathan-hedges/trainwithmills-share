-- Announcements can now carry a voice note and target a group or one client.

-- AlterTable
ALTER TABLE "Announcement" ADD COLUMN "audioKey" TEXT,
ADD COLUMN "audioSeconds" INTEGER,
ADD COLUMN "groupId" TEXT,
ADD COLUMN "clientId" TEXT;

-- CreateIndex
CREATE INDEX "Announcement_showUntil_idx" ON "Announcement"("showUntil");

-- AddForeignKey
ALTER TABLE "Announcement" ADD CONSTRAINT "Announcement_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Announcement" ADD CONSTRAINT "Announcement_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
