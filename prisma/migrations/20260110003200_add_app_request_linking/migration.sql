-- AlterTable
ALTER TABLE "Task" ADD COLUMN "appRequestId" TEXT;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Approval" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "executionId" TEXT,
    "appRequestId" TEXT,
    "taskId" TEXT,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "reason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" DATETIME,
    CONSTRAINT "Approval_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Approval_executionId_fkey" FOREIGN KEY ("executionId") REFERENCES "Execution" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Approval" ("createdAt", "executionId", "id", "projectId", "reason", "resolvedAt", "status", "taskId", "type") SELECT "createdAt", "executionId", "id", "projectId", "reason", "resolvedAt", "status", "taskId", "type" FROM "Approval";
DROP TABLE "Approval";
ALTER TABLE "new_Approval" RENAME TO "Approval";
CREATE INDEX "Approval_projectId_idx" ON "Approval"("projectId");
CREATE INDEX "Approval_executionId_idx" ON "Approval"("executionId");
CREATE INDEX "Approval_appRequestId_idx" ON "Approval"("appRequestId");
CREATE INDEX "Approval_status_idx" ON "Approval"("status");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "Task_appRequestId_idx" ON "Task"("appRequestId");
