-- AlterTable
ALTER TABLE "TemplateExercise" ADD COLUMN     "note" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "notifyForms" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "Form" (
    "id" TEXT NOT NULL,
    "coachId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "questions" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Form_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FormAssignment" (
    "id" TEXT NOT NULL,
    "formId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'assigned',
    "dueDate" TEXT,
    "answers" JSONB,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "FormAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FormRecurrence" (
    "id" TEXT NOT NULL,
    "formId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "cadence" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "lastRun" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FormRecurrence_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FormAssignment_clientId_idx" ON "FormAssignment"("clientId");

-- CreateIndex
CREATE INDEX "FormAssignment_formId_idx" ON "FormAssignment"("formId");

-- CreateIndex
CREATE INDEX "FormRecurrence_clientId_idx" ON "FormRecurrence"("clientId");

-- AddForeignKey
ALTER TABLE "Form" ADD CONSTRAINT "Form_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormAssignment" ADD CONSTRAINT "FormAssignment_formId_fkey" FOREIGN KEY ("formId") REFERENCES "Form"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormAssignment" ADD CONSTRAINT "FormAssignment_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormRecurrence" ADD CONSTRAINT "FormRecurrence_formId_fkey" FOREIGN KEY ("formId") REFERENCES "Form"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormRecurrence" ADD CONSTRAINT "FormRecurrence_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
