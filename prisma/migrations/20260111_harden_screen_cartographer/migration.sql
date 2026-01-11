-- Production Hardening: Add immutability and versioning to Screen Cartographer

-- ScreenIndex Table Changes
ALTER TABLE "ScreenIndex" ADD COLUMN "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "ScreenIndex" ADD COLUMN "screenIndexVersion" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "ScreenIndex" ADD COLUMN "screenIndexHash" TEXT;
ALTER TABLE "ScreenIndex" ADD COLUMN "approvedBy" TEXT;
ALTER TABLE "ScreenIndex" ADD COLUMN "basePromptHash" TEXT NOT NULL DEFAULT '';
ALTER TABLE "ScreenIndex" ADD COLUMN "planningDocsHash" TEXT NOT NULL DEFAULT '';

-- ScreenDefinition Table Changes
ALTER TABLE "ScreenDefinition" ADD COLUMN "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "ScreenDefinition" ADD COLUMN "screenVersion" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "ScreenDefinition" ADD COLUMN "screenHash" TEXT;
ALTER TABLE "ScreenDefinition" ADD COLUMN "approvedBy" TEXT;
ALTER TABLE "ScreenDefinition" ADD COLUMN "screenIndexHash" TEXT NOT NULL DEFAULT '';
ALTER TABLE "ScreenDefinition" ADD COLUMN "basePromptHash" TEXT NOT NULL DEFAULT '';
ALTER TABLE "ScreenDefinition" ADD COLUMN "planningDocsHash" TEXT NOT NULL DEFAULT '';

-- Create indices for hash-based lookups
CREATE INDEX "ScreenIndex_screenIndexHash_idx" ON "ScreenIndex"("screenIndexHash");
CREATE INDEX "ScreenIndex_basePromptHash_idx" ON "ScreenIndex"("basePromptHash");
CREATE INDEX "ScreenDefinition_screenHash_idx" ON "ScreenDefinition"("screenHash");
CREATE INDEX "ScreenDefinition_screenIndexHash_idx" ON "ScreenDefinition"("screenIndexHash");
