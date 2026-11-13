import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';
import {
    deleteProjectScreenshotDirectory,
    deleteScreenshotFileByPath,
} from '@/lib/services/term-screenshot.service';
import { AppError } from '@/lib/api/errors';
import { parseTargetLanguages, serializeTargetLanguages } from '@/lib/language-utils';
import { buildTermSearchWhere } from '@/lib/services/translation-key-search';
import type { CreateProjectInput, UpdateProjectInput } from '@/lib/validators/project.schema';
import { createTermSchema, type CreateTermInput, type UpdateTermInput } from '@/lib/validators/term.schema';
import { appendRemarks, metadataRemarks } from '@/lib/term-metadata';

const termValueSelect = {
    id: true,
    languageCode: true,
    content: true,
    isManual: true,
    lastModifiedBy: { select: { name: true, username: true } },
} satisfies Prisma.TranslationValueSelect;

const termDetailSelect = {
    id: true,
    stringName: true,
    remarks: true,
    developerOwner: true,
    requestNote: true,
    screenshotPath: true,
    screenshotMimeType: true,
    screenshotSize: true,
    screenshotUpdatedAt: true,
    createdAt: true,
    updatedAt: true,
    values: { select: termValueSelect },
    lastModifiedBy: { select: { name: true, username: true } },
} satisfies Prisma.TranslationKeySelect;

const termClearSelect = {
    id: true,
    stringName: true,
    values: {
        select: {
            id: true,
            languageCode: true,
            isManual: true,
        },
    },
} satisfies Prisma.TranslationKeySelect;

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
    options: {
        page: number;
        limit: number;
        search: string;
        displayLanguages?: string[];
        searchLanguages?: string[];
    }
) {
    const { page, limit, search, displayLanguages, searchLanguages } = options;

    const whereClause: Prisma.TranslationKeyWhereInput = {
        projectId,
        ...buildTermSearchWhere(search, searchLanguages ?? displayLanguages),
    };

    const [total, keys] = await prisma.$transaction([
        prisma.translationKey.count({ where: whereClause }),
        prisma.translationKey.findMany({
            where: whereClause,
            select: {
                id: true,
                stringName: true,
                remarks: true,
                developerOwner: true,
                requestNote: true,
                screenshotPath: true,
                screenshotMimeType: true,
                screenshotSize: true,
                screenshotUpdatedAt: true,
                createdAt: true,
                updatedAt: true,
                values: {
                    ...(displayLanguages?.length
                        ? { where: { languageCode: { in: displayLanguages } } }
                        : {}),
                    select: {
                        id: true,
                        languageCode: true,
                        content: true,
                        isManual: true,
                        lastModifiedBy: { select: { name: true, username: true } },
                    },
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
    data: CreateTermInput,
    userId: string
) {
    const validated = createTermSchema.safeParse(data);
    if (!validated.success) throw new AppError('VALIDATION_ERROR', { details: validated.error.issues });
    const { stringName, values, remarks, developerOwner, requestNote } = validated.data;

    // Check uniqueness
    const existing = await prisma.translationKey.findUnique({
        where: { projectId_stringName: { projectId, stringName } },
    });
    if (existing) {
        throw new ConflictError();
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
            remarks: appendRemarks(remarks, metadataRemarks({ developerOwner, requestNote })),
            developerOwner,
            requestNote: requestNote || null,
            sortOrder: nextOrder,
            lastModifiedById: userId,
            values: {
                create: values
                    ? Object.entries(values).map(([code, content]) => ({
                        languageCode: code,
                        content,
                        isManual: Boolean(content.trim()),
                        lastModifiedById: userId,
                    }))
                    : [],
            },
        },
        select: termDetailSelect,
    });
}

export async function updateTerm(
    keyId: string,
    data: UpdateTermInput,
    userId: string
) {
    const { stringName, remarks, values, valueSources, developerOwner, requestNote } = data;

    await prisma.$transaction(async (tx) => {
        if (stringName || remarks !== undefined || developerOwner !== undefined || requestNote !== undefined) {
            const current = await tx.translationKey.findUniqueOrThrow({ where: { id: keyId } });
            const nextOwner = developerOwner ?? current.developerOwner;
            const nextRequest = requestNote ?? current.requestNote;
            const nextRemarks = developerOwner !== undefined || requestNote !== undefined
                ? appendRemarks(remarks !== undefined ? remarks : current.remarks, nextOwner ? metadataRemarks({ developerOwner: nextOwner, requestNote: nextRequest ?? undefined }) : [])
                : remarks;
            await tx.translationKey.update({
                where: { id: keyId },
                data: {
                    ...(stringName ? { stringName } : {}),
                    ...(nextRemarks !== undefined ? { remarks: nextRemarks } : {}),
                    ...(developerOwner !== undefined ? { developerOwner } : {}),
                    ...(requestNote !== undefined ? { requestNote: requestNote || null } : {}),
                    lastModifiedById: userId,
                },
            });
        }

        if (values) {
            for (const [lang, content] of Object.entries(values)) {
                const current = await tx.translationValue.findUnique({
                    where: { translationKeyId_languageCode: { translationKeyId: keyId, languageCode: lang } },
                });
                if (current?.content === content) continue;
                const isManual = (valueSources?.[lang] ?? 'manual') === 'manual';
                await tx.translationValue.upsert({
                    where: {
                        translationKeyId_languageCode: {
                            translationKeyId: keyId,
                            languageCode: lang,
                        },
                    },
                    update: { content, isManual, lastModifiedById: userId },
                    create: {
                        translationKeyId: keyId,
                        languageCode: lang,
                        content,
                        isManual,
                        lastModifiedById: userId,
                    },
                });
            }
        }
    });

    return prisma.translationKey.findUnique({
        where: { id: keyId },
        select: termDetailSelect,
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
            select: termClearSelect,
        });

        if (!term) throw new AppError('TERM_NOT_FOUND');

        const valuesToDelete = term.values.filter(v => v.languageCode !== baseLanguage && !v.isManual);

        if (valuesToDelete.length > 0) {
            await tx.translationValue.deleteMany({
                where: {
                    id: { in: valuesToDelete.map(v => v.id) },
                    isManual: false
                }
            });
        }

        await tx.translationKey.update({
            where: { id: keyId },
            data: { lastModifiedById: userId }
        });

        return tx.translationKey.findUnique({
            where: { id: keyId },
            select: termDetailSelect,
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
    constructor() {
        super('Term with this key already exists');
        this.name = 'ConflictError';
    }
}
