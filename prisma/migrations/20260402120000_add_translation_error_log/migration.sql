-- CreateTable
CREATE TABLE "TranslationErrorLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "translationKeyId" TEXT,
    "keyName" TEXT,
    "languageCode" TEXT NOT NULL,
    "errorCode" TEXT NOT NULL,
    "errorMessage" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "details" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TranslationErrorLog_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TranslationErrorLog_translationKeyId_fkey" FOREIGN KEY ("translationKeyId") REFERENCES "TranslationKey" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "TranslationErrorLog_projectId_createdAt_idx" ON "TranslationErrorLog"("projectId", "createdAt");

-- CreateIndex
CREATE INDEX "TranslationErrorLog_translationKeyId_idx" ON "TranslationErrorLog"("translationKeyId");
