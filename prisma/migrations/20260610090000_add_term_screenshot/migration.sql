-- Add optional screenshot metadata for translation keys.
ALTER TABLE "TranslationKey" ADD COLUMN "screenshotPath" TEXT;
ALTER TABLE "TranslationKey" ADD COLUMN "screenshotMimeType" TEXT;
ALTER TABLE "TranslationKey" ADD COLUMN "screenshotSize" INTEGER;
ALTER TABLE "TranslationKey" ADD COLUMN "screenshotUpdatedAt" DATETIME;
