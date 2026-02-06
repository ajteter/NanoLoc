import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { canEditProject, getSessionUserId } from '@/lib/project-access';
import { getProjectAIConfig } from '@/lib/ai/config';
import { BRClient } from '@/lib/ai/br-client';

const BATCH_SIZE = 20;

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await auth();
    if (!session?.user?.email) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // 1. Verify edit access (public: anyone; private: only owner)
    const project = await prisma.project.findUnique({
        where: { id },
        include: { users: { select: { email: true, id: true } } }
    });

    if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const currentUserId = await getSessionUserId(session);
    if (!canEditProject(project, currentUserId)) return NextResponse.json({ error: "Forbidden: only owner can edit private project" }, { status: 403 });
    if (!currentUserId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // 2. Parse Target Languages
    let targetLanguages: string[] = [];
    try {
        const body = await request.json();
        if (body.targetLanguages && Array.isArray(body.targetLanguages)) {
            targetLanguages = body.targetLanguages;
        } else {
            targetLanguages = JSON.parse(project.targetLanguages || '[]');
        }

        if (!Array.isArray(targetLanguages) || targetLanguages.length === 0) {
            return NextResponse.json({ error: "No target languages configured" }, { status: 400 });
        }
    } catch (e) {
        return NextResponse.json({ error: "Invalid request body or configuration" }, { status: 500 });
    }

    const aiConfig = await getProjectAIConfig(id);
    const aiClient = new BRClient(aiConfig);
    const resultsSummary: Record<string, number> = {};

    try {
        // 3. Iterate over each target language
        for (const lang of targetLanguages) {
            // Find keys that match:
            // 1. Belong to this project
            // 2. Do NOT have a TranslationValue for this language OR the TranslationValue content is empty/null using filtering in memory (or complex filtering)
            // Prisma filtering for "none" related records can be tricky, so we'll fetch all keys and filter or use raw query if performance needed.
            // Given MVP, let's fetch keys that *have* a base value (because we need source text)

            const allKeys = await prisma.translationKey.findMany({
                where: { projectId: id },
                include: { values: true }
            });


            const missingTranslationItems: { keyId: string, sourceText: string }[] = [];

            for (const key of allKeys) {
                const baseVal = key.values.find(v => v.languageCode === project.baseLanguage)?.content;
                // Skip if no source text
                if (!baseVal || !baseVal.trim()) continue;

                const targetVal = key.values.find(v => v.languageCode === lang)?.content;

                // If missing or empty, add to list
                if (!targetVal || !targetVal.trim()) {
                    missingTranslationItems.push({
                        keyId: key.id,
                        sourceText: baseVal
                    });
                }
            }

            if (missingTranslationItems.length === 0) {
                resultsSummary[lang] = 0;
                continue;
            }

            let processedCount = 0;

            // 4. Batch Process
            for (let i = 0; i < missingTranslationItems.length; i += BATCH_SIZE) {
                const batch = missingTranslationItems.slice(i, i + BATCH_SIZE);
                const sourceTexts = batch.map(item => item.sourceText);

                try {
                    const translatedTexts = await aiClient.translateBatch(sourceTexts, lang);

                    // Write back to DB
                    await prisma.$transaction(
                        batch.map((item, index) => {
                            const translatedText = translatedTexts[index];
                            // Ensure we don't save error messages or empty strings if we can avoid it, 
                            // but Client returns "" or "[Error]"
                            if (!translatedText) return null;

                            return prisma.translationValue.upsert({
                                where: {
                                    translationKeyId_languageCode: {
                                        translationKeyId: item.keyId,
                                        languageCode: lang
                                    }
                                },
                                update: {
                                    content: translatedText,
                                    lastModifiedById: currentUserId
                                },
                                create: {
                                    translationKeyId: item.keyId,
                                    languageCode: lang,
                                    content: translatedText,
                                    lastModifiedById: currentUserId
                                }
                            });
                        }).filter((p): p is any => p !== null)
                    );
                    processedCount += batch.length;

                } catch (err) {
                    console.error(`Batch translation failed for ${lang} batch ${i}:`, err);
                    // Continue to next batch? or stop? Let's continue but log.
                }
            }
            resultsSummary[lang] = processedCount;
        }

        return NextResponse.json({ success: true, translated: resultsSummary });

    } catch (error: any) {
        console.error("Batch translate error:", error);
        return NextResponse.json({ error: error.message || "Internal Server Error", details: error.toString(), stack: error.stack }, { status: 500 });
    }
}
