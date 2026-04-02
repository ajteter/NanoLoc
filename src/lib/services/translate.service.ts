import { prisma } from '@/lib/prisma';
import { getProjectAIConfig } from '@/lib/ai/config';
import { BRClient, TRANSLATION_ERROR_PLACEHOLDER } from '@/lib/ai/br-client';
import { normalizeTranslationError, recordTranslationError, type TranslationErrorSource } from '@/lib/services/translation-error.service';

const BATCH_SIZE = 10;

// Process-level lock: prevents concurrent batch translates on the same project
const activeTranslations = new Set<string>();

interface TranslateTextsOptions {
    translationKeyId?: string;
    keyName?: string;
    source?: TranslationErrorSource;
}

/**
 * Translate an array of texts for a single target language using the project's AI config.
 */
export async function translateTexts(
    projectId: string,
    texts: string[],
    targetLang: string,
    options?: TranslateTextsOptions
): Promise<string[]> {
    const config = await getProjectAIConfig(projectId);
    const client = new BRClient(config);
    try {
        const results = await client.translateBatch(texts, targetLang);
        const hasInvalidResult = texts.some((text, index) => {
            if (!text || !text.trim()) return false;
            const translated = results[index];
            return !translated || translated === TRANSLATION_ERROR_PLACEHOLDER;
        });

        if (hasInvalidResult) {
            const resultError = new Error('AI returned an unusable translation result.');
            resultError.name = 'TRANSLATION_RESULT_ERROR';
            throw resultError;
        }

        return results;
    } catch (error) {
        const normalized = normalizeTranslationError(error);
        await recordTranslationError({
            projectId,
            translationKeyId: options?.translationKeyId,
            keyName: options?.keyName,
            languageCode: targetLang,
            errorCode: normalized.errorCode,
            errorMessage: normalized.errorMessage,
            source: options?.source || 'single',
            details: {
                textCount: texts.length,
                texts,
            },
        });
        throw error;
    }
}

/**
 * Batch-translate all missing translations for a project across one or more target languages.
 * Returns a summary of how many terms were processed per language.
 */
export async function batchTranslateProject(
    projectId: string,
    targetLanguages: string[],
    userId: string,
    source: Extract<TranslationErrorSource, 'batch' | 'column'> = 'batch'
): Promise<Record<string, { success: number; failed: number }>> {
    // Prevent concurrent batch translates on the same project
    if (activeTranslations.has(projectId)) {
        throw new Error('This project already has a batch translation in progress. Please wait for it to finish.');
    }
    activeTranslations.add(projectId);

    try {
        const project = await prisma.project.findUnique({ where: { id: projectId } });
        if (!project) throw new Error('Project not found');

        const aiConfig = await getProjectAIConfig(projectId);
        const aiClient = new BRClient(aiConfig);
        const resultsSummary: Record<string, { success: number; failed: number }> = {};

        for (const lang of targetLanguages) {
            const allKeys = await prisma.translationKey.findMany({
                where: { projectId },
                include: { values: true },
            });
            const keyNameMap = new Map(allKeys.map((key) => [key.id, key.stringName]));

            const missingItems: { keyId: string; sourceText: string }[] = [];

            for (const key of allKeys) {
                const baseVal = key.values.find(
                    (v) => v.languageCode === project.baseLanguage
                )?.content;
                if (!baseVal || !baseVal.trim()) continue;

                const targetVal = key.values.find((v) => v.languageCode === lang)?.content;
                if (!targetVal || !targetVal.trim()) {
                    missingItems.push({ keyId: key.id, sourceText: baseVal });
                }
            }

            if (missingItems.length === 0) {
                resultsSummary[lang] = { success: 0, failed: 0 };
                continue;
            }

            let processedCount = 0;
            let failedCount = 0;

            for (let i = 0; i < missingItems.length; i += BATCH_SIZE) {
                const batch = missingItems.slice(i, i + BATCH_SIZE);
                const sourceTexts = batch.map((item) => item.sourceText);

                try {
                    const translatedTexts = await aiClient.translateBatch(sourceTexts, lang);
                    const operations = batch
                        .map((item, index) => {
                            const translatedText = translatedTexts[index];
                            if (!translatedText || translatedText === TRANSLATION_ERROR_PLACEHOLDER) {
                                void recordTranslationError({
                                    projectId,
                                    translationKeyId: item.keyId,
                                    keyName: keyNameMap.get(item.keyId),
                                    languageCode: lang,
                                    errorCode: 'TRANSLATION_RESULT_ERROR',
                                    errorMessage: 'AI returned an unusable translation result.',
                                    source,
                                    details: {
                                        sourceText: item.sourceText,
                                        batchStartIndex: i,
                                    },
                                });
                                failedCount++;
                                return null;
                            }

                            return prisma.translationValue.upsert({
                                where: {
                                    translationKeyId_languageCode: {
                                        translationKeyId: item.keyId,
                                        languageCode: lang,
                                    },
                                },
                                update: { content: translatedText, lastModifiedById: userId },
                                create: {
                                    translationKeyId: item.keyId,
                                    languageCode: lang,
                                    content: translatedText,
                                    lastModifiedById: userId,
                                },
                            });
                        })
                        .filter((p): p is NonNullable<typeof p> => p !== null);

                    if (operations.length > 0) {
                        await prisma.$transaction(operations);
                    }
                    processedCount += operations.length;
                } catch (err) {
                    const normalized = normalizeTranslationError(err);
                    failedCount += batch.length;
                    await Promise.all(
                        batch.map((item) =>
                            recordTranslationError({
                                projectId,
                                translationKeyId: item.keyId,
                                keyName: keyNameMap.get(item.keyId),
                                languageCode: lang,
                                errorCode: normalized.errorCode,
                                errorMessage: normalized.errorMessage,
                                source,
                                details: {
                                    sourceText: item.sourceText,
                                    batchStartIndex: i,
                                },
                            })
                        )
                    );
                    console.error(`Batch translation failed for ${lang} batch ${i}:`, err);
                }
            }

            resultsSummary[lang] = { success: processedCount, failed: failedCount };
        }

        return resultsSummary;
    } finally {
        activeTranslations.delete(projectId);
    }
}
