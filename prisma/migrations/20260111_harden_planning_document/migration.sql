-- Production Hardening: Add immutability and versioning to PlanningDocument

-- Add version tracking
ALTER TABLE "PlanningDocument" ADD COLUMN "documentVersion" INTEGER NOT NULL DEFAULT 1;

-- Add SHA-256 hash of approved document
ALTER TABLE "PlanningDocument" ADD COLUMN "documentHash" TEXT;

-- Add section-level hashes (JSON)
ALTER TABLE "PlanningDocument" ADD COLUMN "sectionHashes" TEXT NOT NULL DEFAULT '{}';

-- Add reference to Base Prompt hash
ALTER TABLE "PlanningDocument" ADD COLUMN "basePromptHash" TEXT;

-- Add approval metadata
ALTER TABLE "PlanningDocument" ADD COLUMN "approvedBy" TEXT;

-- Create indices for hash-based lookups
CREATE INDEX "PlanningDocument_documentHash_idx" ON "PlanningDocument"("documentHash");
CREATE INDEX "PlanningDocument_basePromptHash_idx" ON "PlanningDocument"("basePromptHash");
