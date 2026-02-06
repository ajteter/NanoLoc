-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Project" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "visibility" TEXT NOT NULL DEFAULT 'public',
    "ownerId" TEXT,
    "baseLanguage" TEXT NOT NULL DEFAULT 'en-US',
    "targetLanguages" TEXT NOT NULL DEFAULT '[]',
    "aiBaseUrl" TEXT,
    "aiApiKey" TEXT,
    "aiModelId" TEXT,
    "systemPrompt" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Project_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Project" ("aiApiKey", "aiBaseUrl", "aiModelId", "baseLanguage", "createdAt", "description", "id", "name", "systemPrompt", "targetLanguages", "updatedAt") SELECT "aiApiKey", "aiBaseUrl", "aiModelId", "baseLanguage", "createdAt", "description", "id", "name", "systemPrompt", "targetLanguages", "updatedAt" FROM "Project";
DROP TABLE "Project";
ALTER TABLE "new_Project" RENAME TO "Project";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
