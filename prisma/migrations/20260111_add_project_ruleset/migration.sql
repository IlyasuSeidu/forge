-- CreateTable
CREATE TABLE "ProjectRuleSet" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "appRequestId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedAt" DATETIME,
    CONSTRAINT "ProjectRuleSet_appRequestId_fkey" FOREIGN KEY ("appRequestId") REFERENCES "AppRequest" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "ProjectRuleSet_appRequestId_key" ON "ProjectRuleSet"("appRequestId");

-- CreateIndex
CREATE INDEX "ProjectRuleSet_appRequestId_idx" ON "ProjectRuleSet"("appRequestId");

-- CreateIndex
CREATE INDEX "ProjectRuleSet_status_idx" ON "ProjectRuleSet"("status");
