import { prisma } from '@/lib/prisma';
import { getProjectAIConfig } from '@/lib/ai/config';
import { BRClient, TRANSLATION_ERROR_PLACEHOLDER } from '@/lib/ai/br-client';
import { normalizeTranslationError, recordTranslationError, type TranslationErrorSource } from '@/lib/services/translation-error.service';
import { AppError } from '@/lib/api/errors';
import { comparePlaceholders, type PlaceholderComparison } from '@/lib/placeholder-utils';

const BATCH_SIZE = 10;

// Process-level lock: prevents concurrent batch translates on the same project
const activeTranslations = new Set<string>();

interface TranslateTextsOptions {
    translationKeyId?: string;
    keyName?: string;
    source?: TranslationErrorSource;
}

type BatchTranslationKey = {
    id: string;
    stringName: string;
    values: {
        languageCode: string;
        content: string | null;
    }[];
};

type BatchTranslationCandidate = {
    keyId: string;
    keyName: string;
    sourceText: string;
    valuesByLanguage: Map<string, string>;
};

type PlaceholderMismatch = PlaceholderComparison & {
    index: number;
    sourceText: string;
    translatedText: string;
};

class PlaceholderMismatchError extends Error {
    mismatches: PlaceholderMismatch[];

    constructor(mismatches: PlaceholderMismatch[]) {
        super('AI translation changed one or more placeholders.');
        this.name = 'PLACEHOLDER_MISMATCH';
        this.mismatches = mismatches;
    }
}

function findPlaceholderMismatches(sourceTexts: string[], translatedTexts: string[]) {
    const mismatches: PlaceholderMismatch[] = [];

    sourceTexts.forEach((sourceText, index) => {
        if (!sourceText?.trim()) return;

        const translatedText = translatedTexts[index] || '';
        const comparison = comparePlaceholders(sourceText, translatedText);
        if (!comparison.valid) {
            mismatches.push({
                index,
                sourceText,
                translatedText,
                ...comparison,
            });
        }
    });

    return mismatches;
}

function uniqueLanguageCodes(languageCodes: string[]) {
    return Array.from(new Set(languageCodes));
}

function buildBatchTranslationCandidates(
    keys: BatchTranslationKey[],
    baseLanguage: string
): BatchTranslationCandidate[] {
    const candidates: BatchTranslationCandidate[] = [];

    for (const key of keys) {
        const valuesByLanguage = new Map(
            key.values.map((value) => [value.languageCode, value.content || ''])
        );
        const sourceText = valuesByLanguage.get(baseLanguage);

        if (!sourceText?.trim()) continue;

        candidates.push({
            keyId: key.id,
            keyName: key.stringName,
            sourceText,
            valuesByLanguage,
        });
    }

    return candidates;
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

        const placeholderMismatches = findPlaceholderMismatches(texts, results);
        if (placeholderMismatches.length > 0) {
            throw new PlaceholderMismatchError(placeholderMismatches);
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
                ...(error instanceof PlaceholderMismatchError
                    ? {
                        placeholderMismatches: error.mismatches.map((mismatch) => ({
                            index: mismatch.index,
                            sourceText: mismatch.sourceText,
                            translatedText: mismatch.translatedText,
                            sourceTokens: mismatch.source,
                            translatedTokens: mismatch.translated,
                            missingTokens: mismatch.missing,
                            extraTokens: mismatch.extra,
                        })),
                    }
                    : {}),
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
        if (!project) throw new AppError('PROJECT_NOT_FOUND');

        const aiConfig = await getProjectAIConfig(projectId);
        const aiClient = new BRClient(aiConfig);
        const resultsSummary: Record<string, { success: number; failed: number }> = {};
        const languagesToLoad = uniqueLanguageCodes([project.baseLanguage, ...targetLanguages]);
        const allKeys = await prisma.translationKey.findMany({
            where: { projectId },
            select: {
                id: true,
                stringName: true,
                values: {
                    where: { languageCode: { in: languagesToLoad } },
                    select: {
                        languageCode: true,
                        content: true,
                    },
                },
            },
        });
        const candidates = buildBatchTranslationCandidates(allKeys, project.baseLanguage);
        const keyNameMap = new Map(candidates.map((key) => [key.keyId, key.keyName]));

        for (const lang of targetLanguages) {
            const missingItems = candidates
                .filter((key) => !key.valuesByLanguage.get(lang)?.trim())
                .map((key) => ({ keyId: key.keyId, sourceText: key.sourceText }));

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
                    const errorLogs: Parameters<typeof recordTranslationError>[0][] = [];
                    const operations = batch
                        .map((item, index) => {
                            const translatedText = translatedTexts[index];
                            if (!translatedText || translatedText === TRANSLATION_ERROR_PLACEHOLDER) {
                                errorLogs.push({
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

                            const placeholderComparison = comparePlaceholders(item.sourceText, translatedText);
                            if (!placeholderComparison.valid) {
                                errorLogs.push({
                                    projectId,
                                    translationKeyId: item.keyId,
                                    keyName: keyNameMap.get(item.keyId),
                                    languageCode: lang,
                                    errorCode: 'PLACEHOLDER_MISMATCH',
                                    errorMessage: 'AI translation changed one or more placeholders.',
                                    source,
                                    details: {
                                        sourceText: item.sourceText,
                                        translatedText,
                                        sourceTokens: placeholderComparison.source,
                                        translatedTokens: placeholderComparison.translated,
                                        missingTokens: placeholderComparison.missing,
                                        extraTokens: placeholderComparison.extra,
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

                    if (errorLogs.length > 0) {
                        await Promise.all(errorLogs.map((input) => recordTranslationError(input)));
                    }

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
