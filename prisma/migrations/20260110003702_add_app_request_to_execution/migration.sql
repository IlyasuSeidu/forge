-- AlterTable
ALTER TABLE "Execution" ADD COLUMN "appRequestId" TEXT;

-- CreateIndex
CREATE INDEX "Execution_appRequestId_idx" ON "Execution"("appRequestId");
