-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_TranslationKey" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "stringName" TEXT NOT NULL,
    "remarks" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "projectId" TEXT NOT NULL,
    "lastModifiedById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TranslationKey_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TranslationKey_lastModifiedById_fkey" FOREIGN KEY ("lastModifiedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_TranslationKey" ("createdAt", "id", "lastModifiedById", "projectId", "remarks", "stringName", "updatedAt") SELECT "createdAt", "id", "lastModifiedById", "projectId", "remarks", "stringName", "updatedAt" FROM "TranslationKey";
DROP TABLE "TranslationKey";
ALTER TABLE "new_TranslationKey" RENAME TO "TranslationKey";
CREATE INDEX "TranslationKey_stringName_idx" ON "TranslationKey"("stringName");
CREATE INDEX "TranslationKey_projectId_sortOrder_idx" ON "TranslationKey"("projectId", "sortOrder");
CREATE UNIQUE INDEX "TranslationKey_projectId_stringName_key" ON "TranslationKey"("projectId", "stringName");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
