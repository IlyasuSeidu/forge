-- CreateTable: ExecutionPlan
CREATE TABLE "ExecutionPlan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "appRequestId" TEXT NOT NULL,
    "buildPromptId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedAt" DATETIME,
    CONSTRAINT "ExecutionPlan_appRequestId_fkey" FOREIGN KEY ("appRequestId") REFERENCES "AppRequest" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable: ExecutionUnit
CREATE TABLE "ExecutionUnit" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "executionPlanId" TEXT NOT NULL,
    "sequenceIndex" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "allowedCreateFiles" TEXT NOT NULL DEFAULT '[]',
    "allowedModifyFiles" TEXT NOT NULL DEFAULT '[]',
    "forbiddenFiles" TEXT NOT NULL DEFAULT '[]',
    "fullRewriteFiles" TEXT NOT NULL DEFAULT '[]',
    "dependencyChanges" TEXT NOT NULL DEFAULT '{}',
    "modificationIntent" TEXT NOT NULL DEFAULT '{}',
    "status" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" DATETIME,
    CONSTRAINT "ExecutionUnit_executionPlanId_fkey" FOREIGN KEY ("executionPlanId") REFERENCES "ExecutionPlan" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "ExecutionPlan_appRequestId_idx" ON "ExecutionPlan"("appRequestId");
CREATE INDEX "ExecutionPlan_buildPromptId_idx" ON "ExecutionPlan"("buildPromptId");
CREATE INDEX "ExecutionPlan_status_idx" ON "ExecutionPlan"("status");

-- CreateIndex
CREATE INDEX "ExecutionUnit_executionPlanId_idx" ON "ExecutionUnit"("executionPlanId");
CREATE INDEX "ExecutionUnit_sequenceIndex_idx" ON "ExecutionUnit"("sequenceIndex");
CREATE INDEX "ExecutionUnit_status_idx" ON "ExecutionUnit"("status");
