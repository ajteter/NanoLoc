-- Speed up language-scoped table value loading and duplicate/content scans.
CREATE INDEX "TranslationValue_languageCode_content_idx" ON "TranslationValue"("languageCode", "content");
