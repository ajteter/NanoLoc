ALTER TABLE "TranslationKey" ADD COLUMN "developerOwner" TEXT;
ALTER TABLE "TranslationKey" ADD COLUMN "requestNote" TEXT;
ALTER TABLE "TranslationValue" ADD COLUMN "isManual" BOOLEAN NOT NULL DEFAULT false;
