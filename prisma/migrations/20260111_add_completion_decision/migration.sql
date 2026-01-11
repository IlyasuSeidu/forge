-- CreateTable: CompletionDecision
CREATE TABLE "CompletionDecision" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "appRequestId" TEXT NOT NULL,
    "executionUnitId" TEXT,
    "decisionType" TEXT NOT NULL,
    "reason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CompletionDecision_appRequestId_fkey" FOREIGN KEY ("appRequestId") REFERENCES "AppRequest" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "CompletionDecision_appRequestId_idx" ON "CompletionDecision"("appRequestId");
CREATE INDEX "CompletionDecision_decisionType_idx" ON "CompletionDecision"("decisionType");
CREATE INDEX "CompletionDecision_createdAt_idx" ON "CompletionDecision"("createdAt");
