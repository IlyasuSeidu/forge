-- AlterTable
ALTER TABLE "Task" ADD COLUMN "executionId" TEXT;
ALTER TABLE "Task" ADD COLUMN "finishedAt" DATETIME;
ALTER TABLE "Task" ADD COLUMN "startedAt" DATETIME;

-- CreateIndex
CREATE INDEX "Task_executionId_idx" ON "Task"("executionId");
