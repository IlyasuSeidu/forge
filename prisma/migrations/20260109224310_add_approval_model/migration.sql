-- CreateTable
CREATE TABLE "Approval" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "executionId" TEXT NOT NULL,
    "taskId" TEXT,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "reason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" DATETIME,
    CONSTRAINT "Approval_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Approval_executionId_fkey" FOREIGN KEY ("executionId") REFERENCES "Execution" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Approval_projectId_idx" ON "Approval"("projectId");

-- CreateIndex
CREATE INDEX "Approval_executionId_idx" ON "Approval"("executionId");

-- CreateIndex
CREATE INDEX "Approval_status_idx" ON "Approval"("status");
