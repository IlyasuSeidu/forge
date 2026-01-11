-- CreateTable
CREATE TABLE "BuildPrompt" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "appRequestId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedAt" DATETIME,
    CONSTRAINT "BuildPrompt_appRequestId_fkey" FOREIGN KEY ("appRequestId") REFERENCES "AppRequest" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "BuildPrompt_appRequestId_idx" ON "BuildPrompt"("appRequestId");

-- CreateIndex
CREATE INDEX "BuildPrompt_order_idx" ON "BuildPrompt"("order");

-- CreateIndex
CREATE INDEX "BuildPrompt_status_idx" ON "BuildPrompt"("status");
