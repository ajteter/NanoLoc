import { prisma } from '@/lib/prisma';

// ─── Projects ────────────────────────────────────────────────────────────────

export async function listProjects() {
    return prisma.project.findMany({
        orderBy: { updatedAt: 'desc' },
    });
}

export async function getProject(id: string) {
    return prisma.project.findUnique({
        where: { id },
    });
}

export async function createProject(data: {
    name: string;
    description?: string;
    baseLanguage?: string;
    targetLanguages?: string[];
    aiBaseUrl?: string;
    aiApiKey?: string;
    aiModelId?: string;
    systemPrompt?: string;
}) {
    const { targetLanguages, ...rest } = data;
    return prisma.project.create({
        data: {
            ...rest,
            targetLanguages: JSON.stringify(targetLanguages ?? []),
        },
    });
}

export async function updateProject(
    id: string,
    data: {
        name?: string;
        description?: string;
        baseLanguage?: string;
        targetLanguages?: string[];
        aiBaseUrl?: string;
        aiApiKey?: string;
        aiModelId?: string;
        systemPrompt?: string;
    }
) {
    const updateData: Record<string, unknown> = { ...data };
    if (data.targetLanguages) {
        updateData.targetLanguages = JSON.stringify(data.targetLanguages);
    }
    // Remove the array version so Prisma gets the stringified value
    if (Array.isArray(updateData.targetLanguages)) {
        updateData.targetLanguages = JSON.stringify(updateData.targetLanguages);
    }
    return prisma.project.update({ where: { id }, data: updateData });
}

export async function deleteProject(id: string) {
    return prisma.project.delete({ where: { id } });
}

// ─── Terms (TranslationKeys + TranslationValues) ────────────────────────────

export async function listTerms(
    projectId: string,
    options: { page: number; limit: number; search: string }
) {
    const { page, limit, search } = options;

    const whereClause: Record<string, unknown> = { projectId };

    if (search) {
        whereClause.OR = [
            { stringName: { contains: search } },
            { remarks: { contains: search } },
            { values: { some: { content: { contains: search } } } },
        ];
    }

    const [total, keys] = await prisma.$transaction([
        prisma.translationKey.count({ where: whereClause }),
        prisma.translationKey.findMany({
            where: whereClause,
            include: {
                values: {
                    include: { lastModifiedBy: { select: { name: true } } },
                },
                lastModifiedBy: { select: { name: true } },
            },
            skip: (page - 1) * limit,
            take: limit,
            orderBy: { updatedAt: 'desc' },
        }),
    ]);

    return {
        data: keys,
        meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
}

export async function createTerm(
    projectId: string,
    data: { stringName: string; values?: Record<string, string>; remarks?: string },
    userId: string
) {
    const { stringName, values, remarks } = data;

    // Check uniqueness
    const existing = await prisma.translationKey.findUnique({
        where: { projectId_stringName: { projectId, stringName } },
    });
    if (existing) {
        throw new ConflictError('Term with this key already exists');
    }

    return prisma.translationKey.create({
        data: {
            projectId,
            stringName,
            remarks,
            lastModifiedById: userId,
            values: {
                create: values
                    ? Object.entries(values).map(([code, content]) => ({
                        languageCode: code,
                        content,
                        lastModifiedById: userId,
                    }))
                    : [],
            },
        },
        include: { values: true },
    });
}

export async function updateTerm(
    keyId: string,
    data: { stringName?: string; remarks?: string | null; values?: Record<string, string> },
    userId: string
) {
    const { stringName, remarks, values } = data;

    await prisma.$transaction(async (tx) => {
        if (stringName || remarks !== undefined) {
            await tx.translationKey.update({
                where: { id: keyId },
                data: {
                    ...(stringName ? { stringName } : {}),
                    ...(remarks !== undefined ? { remarks } : {}),
                    lastModifiedById: userId,
                },
            });
        }

        if (values) {
            for (const [lang, content] of Object.entries(values)) {
                await tx.translationValue.upsert({
                    where: {
                        translationKeyId_languageCode: {
                            translationKeyId: keyId,
                            languageCode: lang,
                        },
                    },
                    update: { content, lastModifiedById: userId },
                    create: {
                        translationKeyId: keyId,
                        languageCode: lang,
                        content,
                        lastModifiedById: userId,
                    },
                });
            }
        }
    });

    return prisma.translationKey.findUnique({
        where: { id: keyId },
        include: { values: true },
    });
}

export async function deleteTerm(keyId: string) {
    return prisma.translationKey.delete({ where: { id: keyId } });
}

// ─── User helpers ────────────────────────────────────────────────────────────

export async function getUserByUsername(username: string) {
    return prisma.user.findUnique({ where: { username } });
}

// ─── Custom Errors ───────────────────────────────────────────────────────────

export class ConflictError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'ConflictError';
    }
}
