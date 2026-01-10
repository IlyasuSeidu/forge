-- CreateTable
CREATE TABLE "Verification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "appRequestId" TEXT NOT NULL,
    "executionId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "errors" TEXT,
    "attempt" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Verification_appRequestId_fkey" FOREIGN KEY ("appRequestId") REFERENCES "AppRequest" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Verification_appRequestId_idx" ON "Verification"("appRequestId");

-- CreateIndex
CREATE INDEX "Verification_executionId_idx" ON "Verification"("executionId");

-- CreateIndex
CREATE INDEX "Verification_status_idx" ON "Verification"("status");
