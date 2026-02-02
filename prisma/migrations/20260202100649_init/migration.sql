-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "baseLanguage" TEXT NOT NULL DEFAULT 'en-US',
    "targetLanguages" TEXT NOT NULL DEFAULT '[]',
    "aiBaseUrl" TEXT,
    "aiApiKey" TEXT,
    "aiModelId" TEXT,
    "systemPrompt" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "TranslationKey" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "stringName" TEXT NOT NULL,
    "remarks" TEXT,
    "projectId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TranslationKey_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TranslationValue" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "languageCode" TEXT NOT NULL,
    "content" TEXT,
    "translationKeyId" TEXT NOT NULL,
    CONSTRAINT "TranslationValue_translationKeyId_fkey" FOREIGN KEY ("translationKeyId") REFERENCES "TranslationKey" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "_ProjectToUser" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_ProjectToUser_A_fkey" FOREIGN KEY ("A") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_ProjectToUser_B_fkey" FOREIGN KEY ("B") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "TranslationKey_stringName_idx" ON "TranslationKey"("stringName");

-- CreateIndex
CREATE UNIQUE INDEX "TranslationKey_projectId_stringName_key" ON "TranslationKey"("projectId", "stringName");

-- CreateIndex
CREATE UNIQUE INDEX "TranslationValue_translationKeyId_languageCode_key" ON "TranslationValue"("translationKeyId", "languageCode");

-- CreateIndex
CREATE UNIQUE INDEX "_ProjectToUser_AB_unique" ON "_ProjectToUser"("A", "B");

-- CreateIndex
CREATE INDEX "_ProjectToUser_B_index" ON "_ProjectToUser"("B");
