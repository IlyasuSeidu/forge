-- AlterTable: Add immutability and versioning fields to FoundrySession
ALTER TABLE "FoundrySession" ADD COLUMN "basePromptVersion" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "FoundrySession" ADD COLUMN "basePromptHash" TEXT;
ALTER TABLE "FoundrySession" ADD COLUMN "approvedAt" DATETIME;
ALTER TABLE "FoundrySession" ADD COLUMN "approvedBy" TEXT;

-- CreateIndex
CREATE INDEX "FoundrySession_basePromptHash_idx" ON "FoundrySession"("basePromptHash");
