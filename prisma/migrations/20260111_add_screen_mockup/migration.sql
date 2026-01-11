-- CreateTable
CREATE TABLE "ScreenMockup" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "appRequestId" TEXT NOT NULL,
    "screenName" TEXT NOT NULL,
    "layoutType" TEXT NOT NULL,
    "imagePath" TEXT NOT NULL,
    "promptMetadata" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedAt" DATETIME,
    CONSTRAINT "ScreenMockup_appRequestId_fkey" FOREIGN KEY ("appRequestId") REFERENCES "AppRequest" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "ScreenMockup_appRequestId_idx" ON "ScreenMockup"("appRequestId");

-- CreateIndex
CREATE INDEX "ScreenMockup_screenName_idx" ON "ScreenMockup"("screenName");

-- CreateIndex
CREATE INDEX "ScreenMockup_status_idx" ON "ScreenMockup"("status");
