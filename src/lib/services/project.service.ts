import { prisma } from '@/lib/prisma';
import {
    deleteProjectScreenshotDirectory,
    deleteScreenshotFileByPath,
} from '@/lib/services/term-screenshot.service';
import { parseTargetLanguages, serializeTargetLanguages } from '@/lib/language-utils';
import type { CreateProjectInput, UpdateProjectInput } from '@/lib/validators/project.schema';

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

export async function createProject(data: CreateProjectInput) {
    const { targetLanguages, ...rest } = data;
    return prisma.project.create({
        data: {
            ...rest,
            targetLanguages: serializeTargetLanguages(targetLanguages, rest.baseLanguage),
        },
    });
}

export async function updateProject(id: string, data: UpdateProjectInput) {
    const updateData: Record<string, unknown> = { ...data };
    if (Array.isArray(data.targetLanguages) || data.baseLanguage) {
        const existing = await prisma.project.findUnique({
            where: { id },
            select: { baseLanguage: true, targetLanguages: true },
        });
        const baseLanguage = data.baseLanguage ?? existing?.baseLanguage;
        const targetLanguages = Array.isArray(data.targetLanguages)
            ? data.targetLanguages
            : parseTargetLanguages(existing?.targetLanguages);

        updateData.targetLanguages = serializeTargetLanguages(targetLanguages, baseLanguage);
    }
    return prisma.project.update({ where: { id }, data: updateData });
}

export async function deleteProject(id: string) {
    const deletedProject = await prisma.project.delete({ where: { id } });
    await deleteProjectScreenshotDirectory(id);
    return deletedProject;
}

// ─── Terms (TranslationKeys + TranslationValues) ────────────────────────────

export async function listTerms(
    projectId: string,
    options: { page: number; limit: number; search: string; displayLanguages?: string[] }
) {
    const { page, limit, search, displayLanguages } = options;

    const whereClause: Record<string, unknown> = { projectId };

    if (search) {
        const valueSearchClause = displayLanguages?.length
            ? {
                values: {
                    some: {
                        languageCode: { in: displayLanguages },
                        content: { contains: search },
                    },
                },
            }
            : { values: { some: { content: { contains: search } } } };

        whereClause.OR = [
            { stringName: { contains: search } },
            { remarks: { contains: search } },
            valueSearchClause,
        ];
    }

    const [total, keys] = await prisma.$transaction([
        prisma.translationKey.count({ where: whereClause }),
        prisma.translationKey.findMany({
            where: whereClause,
            include: {
                values: {
                    ...(displayLanguages?.length
                        ? { where: { languageCode: { in: displayLanguages } } }
                        : {}),
                    include: { lastModifiedBy: { select: { name: true, username: true } } },
                },
                lastModifiedBy: { select: { name: true, username: true } },
            },
            skip: (page - 1) * limit,
            take: limit,
            orderBy: { sortOrder: 'desc' },
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

    // Assign sortOrder = max + 1 so new terms appear at top (DESC display)
    const maxResult = await prisma.translationKey.aggregate({
        where: { projectId },
        _max: { sortOrder: true },
    });
    const nextOrder = (maxResult._max.sortOrder ?? -1) + 1;

    return prisma.translationKey.create({
        data: {
            projectId,
            stringName,
            remarks,
            sortOrder: nextOrder,
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
    const deletedTerm = await prisma.translationKey.delete({
        where: { id: keyId },
        select: {
            id: true,
            screenshotPath: true,
        },
    });

    await deleteScreenshotFileByPath(deletedTerm.screenshotPath);
    return deletedTerm;
}

export async function clearTermTranslations(keyId: string, baseLanguage: string, userId: string) {
    return prisma.$transaction(async (tx) => {
        const term = await tx.translationKey.findUnique({
            where: { id: keyId },
            include: { values: true },
        });

        if (!term) throw new Error("Term not found");

        const valuesToDelete = term.values.filter(v => v.languageCode !== baseLanguage);

        if (valuesToDelete.length > 0) {
            await tx.translationValue.deleteMany({
                where: {
                    id: { in: valuesToDelete.map(v => v.id) }
                }
            });
        }

        await tx.translationKey.update({
            where: { id: keyId },
            data: { lastModifiedById: userId }
        });

        return tx.translationKey.findUnique({
            where: { id: keyId },
            include: { values: true },
        });
    });
}

// ─── User helpers ────────────────────────────────────────────────────────────

export async function getUserByUsername(username: string) {
    return prisma.user.findUnique({ where: { username } });
}

// ─── Custom Errors ───────────────────────────────────────────────────────────

// ─── Activity Log ────────────────────────────────────────────────────────────

export async function listRecentActivity(options: { page: number; limit: number }) {
    const { page, limit } = options;

    const [total, values] = await prisma.$transaction([
        prisma.translationValue.count(),
        prisma.translationValue.findMany({
            orderBy: { updatedAt: 'desc' },
            skip: (page - 1) * limit,
            take: limit,
            include: {
                lastModifiedBy: { select: { name: true, username: true } },
                translationKey: {
                    select: {
                        stringName: true,
                        project: { select: { id: true, name: true } },
                    },
                },
            },
        }),
    ]);

    return {
        data: values,
        meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
}

// ─── Errors ──────────────────────────────────────────────────────────────────

export class ConflictError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'ConflictError';
    }
}
