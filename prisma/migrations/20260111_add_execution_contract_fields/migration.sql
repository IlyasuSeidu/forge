-- AlterTable: Rename order to sequenceIndex
ALTER TABLE "BuildPrompt" RENAME COLUMN "order" TO "sequenceIndex";

-- AlterTable: Add feedback column
ALTER TABLE "BuildPrompt" ADD COLUMN "feedback" TEXT;

-- AlterTable: Add execution contract fields
ALTER TABLE "BuildPrompt" ADD COLUMN "allowedCreateFiles" TEXT NOT NULL DEFAULT '[]';
ALTER TABLE "BuildPrompt" ADD COLUMN "allowedModifyFiles" TEXT NOT NULL DEFAULT '[]';
ALTER TABLE "BuildPrompt" ADD COLUMN "forbiddenFiles" TEXT NOT NULL DEFAULT '[]';
ALTER TABLE "BuildPrompt" ADD COLUMN "fullRewriteFiles" TEXT NOT NULL DEFAULT '[]';
ALTER TABLE "BuildPrompt" ADD COLUMN "dependencyManifest" TEXT NOT NULL DEFAULT '{}';
ALTER TABLE "BuildPrompt" ADD COLUMN "modificationIntent" TEXT NOT NULL DEFAULT '{}';

-- Recreate index on sequenceIndex (SQLite requires dropping and recreating)
DROP INDEX "BuildPrompt_order_idx";
CREATE INDEX "BuildPrompt_sequenceIndex_idx" ON "BuildPrompt"("sequenceIndex");
