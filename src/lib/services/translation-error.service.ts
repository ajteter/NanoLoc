import { prisma } from '@/lib/prisma';

export type TranslationErrorSource = 'single' | 'row' | 'column' | 'batch';

export interface TranslationErrorRecordInput {
    projectId: string;
    translationKeyId?: string;
    keyName?: string;
    languageCode: string;
    errorCode: string;
    errorMessage: string;
    source: TranslationErrorSource;
    details?: Record<string, unknown>;
}

export function normalizeTranslationError(error: unknown): {
    errorCode: string;
    errorMessage: string;
} {
    if (error instanceof Error) {
        const message = error.message || 'Unknown translation error';
        const apiMatch = message.match(/AI API error:\s*(\d{3})/);
        if (apiMatch) {
            return {
                errorCode: `AI_API_${apiMatch[1]}`,
                errorMessage: message,
            };
        }

        return {
            errorCode: error.name || 'TRANSLATION_ERROR',
            errorMessage: message,
        };
    }

    return {
        errorCode: 'UNKNOWN_ERROR',
        errorMessage: 'Unknown translation error',
    };
}

export async function recordTranslationError(input: TranslationErrorRecordInput) {
    try {
        await prisma.translationErrorLog.create({
            data: {
                projectId: input.projectId,
                translationKeyId: input.translationKeyId || null,
                keyName: input.keyName || null,
                languageCode: input.languageCode,
                errorCode: input.errorCode,
                errorMessage: input.errorMessage,
                source: input.source,
                details: input.details ? JSON.stringify(input.details) : null,
            },
        });
    } catch (err) {
        console.error('Translation error log write failed:', err);
    }
}

export async function listProjectTranslationErrors(projectId: string, limit = 100) {
    return prisma.translationErrorLog.findMany({
        where: { projectId },
        orderBy: { createdAt: 'desc' },
        take: limit,
    });
}
