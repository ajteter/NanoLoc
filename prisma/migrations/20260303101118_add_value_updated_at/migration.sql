-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_TranslationValue" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "languageCode" TEXT NOT NULL,
    "content" TEXT,
    "translationKeyId" TEXT NOT NULL,
    "lastModifiedById" TEXT,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TranslationValue_translationKeyId_fkey" FOREIGN KEY ("translationKeyId") REFERENCES "TranslationKey" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TranslationValue_lastModifiedById_fkey" FOREIGN KEY ("lastModifiedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_TranslationValue" ("content", "id", "languageCode", "lastModifiedById", "translationKeyId") SELECT "content", "id", "languageCode", "lastModifiedById", "translationKeyId" FROM "TranslationValue";
DROP TABLE "TranslationValue";
ALTER TABLE "new_TranslationValue" RENAME TO "TranslationValue";
CREATE INDEX "TranslationValue_updatedAt_idx" ON "TranslationValue"("updatedAt");
CREATE UNIQUE INDEX "TranslationValue_translationKeyId_languageCode_key" ON "TranslationValue"("translationKeyId", "languageCode");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
