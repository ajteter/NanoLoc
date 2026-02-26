import { prisma } from '@/lib/prisma';
import { getProjectAIConfig } from '@/lib/ai/config';
import { BRClient } from '@/lib/ai/br-client';

const BATCH_SIZE = 10;

/**
 * Translate an array of texts for a single target language using the project's AI config.
 */
export async function translateTexts(
    projectId: string,
    texts: string[],
    targetLang: string
): Promise<string[]> {
    const config = await getProjectAIConfig(projectId);
    const client = new BRClient(config);
    return client.translateBatch(texts, targetLang);
}

/**
 * Batch-translate all missing translations for a project across one or more target languages.
 * Returns a summary of how many terms were processed per language.
 */
export async function batchTranslateProject(
    projectId: string,
    targetLanguages: string[],
    userId: string
): Promise<Record<string, number>> {
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new Error('Project not found');

    const aiConfig = await getProjectAIConfig(projectId);
    const aiClient = new BRClient(aiConfig);
    const resultsSummary: Record<string, number> = {};

    for (const lang of targetLanguages) {
        const allKeys = await prisma.translationKey.findMany({
            where: { projectId },
            include: { values: true },
        });

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
            resultsSummary[lang] = 0;
            continue;
        }

        let processedCount = 0;

        for (let i = 0; i < missingItems.length; i += BATCH_SIZE) {
            const batch = missingItems.slice(i, i + BATCH_SIZE);
            const sourceTexts = batch.map((item) => item.sourceText);

            try {
                const translatedTexts = await aiClient.translateBatch(sourceTexts, lang);

                await prisma.$transaction(
                    batch
                        .map((item, index) => {
                            const translatedText = translatedTexts[index];
                            if (!translatedText) return null;

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
                        .filter((p): p is NonNullable<typeof p> => p !== null)
                );
                processedCount += batch.length;
            } catch (err) {
                console.error(`Batch translation failed for ${lang} batch ${i}:`, err);
            }
        }

        resultsSummary[lang] = processedCount;
    }

    return resultsSummary;
}
