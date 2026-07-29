import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import { comparePlaceholders } from '../src/lib/placeholder-utils';

dotenv.config();

const prisma = new PrismaClient();

async function main() {
    const projects = await prisma.project.findMany({
        select: {
            id: true,
            name: true,
            baseLanguage: true,
            targetLanguages: true,
            keys: {
                select: {
                    id: true,
                    stringName: true,
                    values: {
                        select: {
                            languageCode: true,
                            content: true,
                        },
                    },
                },
            },
        },
        orderBy: { name: 'asc' },
    });

    let checkedTranslations = 0;
    let mismatchCount = 0;

    for (const project of projects) {
        let configuredTargetLanguages: string[] = [];
        try {
            const parsed = JSON.parse(project.targetLanguages);
            configuredTargetLanguages = Array.isArray(parsed)
                ? parsed.filter((value): value is string => typeof value === 'string')
                : [];
        } catch {
            configuredTargetLanguages = [];
        }
        const targetLanguageSet = new Set(configuredTargetLanguages);

        for (const key of project.keys) {
            const baseText = key.values.find(
                (value) => value.languageCode === project.baseLanguage
            )?.content;
            if (!baseText?.trim()) continue;

            for (const value of key.values) {
                if (!targetLanguageSet.has(value.languageCode) || !value.content?.trim()) continue;

                checkedTranslations++;
                const comparison = comparePlaceholders(baseText, value.content);
                if (comparison.valid) continue;

                mismatchCount++;
                console.log(JSON.stringify({
                    projectId: project.id,
                    projectName: project.name,
                    keyId: key.id,
                    keyName: key.stringName,
                    baseLanguage: project.baseLanguage,
                    targetLanguage: value.languageCode,
                    sourceText: baseText,
                    translatedText: value.content,
                    sourceTokens: comparison.source,
                    translatedTokens: comparison.translated,
                    missingTokens: comparison.missing,
                    extraTokens: comparison.extra,
                }));
            }
        }
    }

    console.log(`Checked ${checkedTranslations} translations in ${projects.length} projects.`);
    console.log(`Found ${mismatchCount} placeholder mismatches. No data was modified.`);

    if (mismatchCount > 0) {
        process.exitCode = 1;
    }
}

main()
    .catch((error) => {
        console.error(error);
        process.exitCode = 1;
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
