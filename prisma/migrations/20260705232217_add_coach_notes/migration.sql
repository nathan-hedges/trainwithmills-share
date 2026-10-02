-- CreateTable
CREATE TABLE "CoachNote" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CoachNote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CoachNote_clientId_createdAt_idx" ON "CoachNote"("clientId", "createdAt");

-- AddForeignKey
ALTER TABLE "CoachNote" ADD CONSTRAINT "CoachNote_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
