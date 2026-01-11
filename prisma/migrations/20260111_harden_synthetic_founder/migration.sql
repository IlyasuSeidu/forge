-- AlterTable: Add contract and requestHash fields to SyntheticAnswer for production hardening
ALTER TABLE "SyntheticAnswer" ADD COLUMN "contract" TEXT NOT NULL DEFAULT '{}';
ALTER TABLE "SyntheticAnswer" ADD COLUMN "requestHash" TEXT NOT NULL DEFAULT '';

-- CreateIndex: Add index on requestHash for deduplication
CREATE INDEX "SyntheticAnswer_requestHash_idx" ON "SyntheticAnswer"("requestHash");
