import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { AndroidXmlParser } from '@/lib/parsers/android-xml';
import { H5JsonParser } from '@/lib/parsers/h5-json';
import { IOSStringsParser } from '@/lib/parsers/ios-strings';
import { getProjectLanguageCodes } from '@/lib/language-utils';
import { AppError } from '@/lib/api/errors';
import { buildTermSearchWhere, normalizeTermSearch } from '@/lib/services/translation-key-search';
import {
    buildCsvHeader,
    buildCsvRow,
    formatFullJsonPullEntry,
    formatSingleJsonPullEntry,
    formatXmlStringResource,
    getTranslationValueMap,
} from '@/lib/storage-format-contract';

type TranslationValueRow = {
    languageCode: string;
    content: string | null;
};

type CsvExportKeyRow = {
    id: string;
    stringName: string;
    remarks: string | null;
    values: TranslationValueRow[];
};

type CsvExportScope = {
    fileName: string;
    baseLanguage: string;
    targetLangs: string[];
    allLanguages: string[];
    search: string;
};

type CsvExportOptions = {
    search?: string | null;
};

type PullExportKeyRow = {
    id: string;
    stringName: string;
    values: TranslationValueRow[];
};

type PullProjectFormat = 'json' | 'xml';

type PullExportScope = {
    format: PullProjectFormat;
    isFullJson: boolean;
    baseLanguage: string;
    targetLang: string;
    allLanguages: string[];
    requestedLanguages: string[];
    contentType: string;
};

const CSV_EXPORT_BATCH_SIZE = 500;
const PULL_EXPORT_BATCH_SIZE = 500;

function uniqueLanguageCodes(languageCodes: string[]) {
    return Array.from(new Set(languageCodes));
}

function toSafeExportFileNamePart(value: string, fallback: string, maxLength = 60) {
    const safeName = value.replace(/[^a-z0-9 \-_.]/gi, '_').trim();
    return (safeName || fallback).slice(0, maxLength);
}

function toSafeExportFileName(projectName: string, search?: string) {
    const safeProjectName = toSafeExportFileNamePart(projectName, 'project');
    const safeSearch = search ? toSafeExportFileNamePart(search, 'query', 40) : '';
    return safeSearch
        ? `${safeProjectName}_search_${safeSearch}_export.csv`
        : `${safeProjectName}_export.csv`;
}

async function getCsvExportScope(projectId: string, options: CsvExportOptions = {}): Promise<CsvExportScope> {
    const project = await prisma.project.findUnique({
        where: { id: projectId },
        select: { name: true, baseLanguage: true, targetLanguages: true },
    });

    if (!project) throw new AppError('PROJECT_NOT_FOUND');

    const { baseLanguage, targetLanguages: targetLangs, allLanguages } = getProjectLanguageCodes(project);
    const search = normalizeTermSearch(options.search);

    return {
        fileName: toSafeExportFileName(project.name, search),
        baseLanguage,
        targetLangs,
        allLanguages,
        search,
    };
}

async function* generateCsvChunks(projectId: string, scope: CsvExportScope) {
    const { baseLanguage, targetLangs, allLanguages, search } = scope;
    yield '\uFEFF' + buildCsvHeader(baseLanguage, targetLangs) + '\n';

    let cursor: string | undefined;
    const whereClause: Prisma.TranslationKeyWhereInput = {
        projectId,
        ...buildTermSearchWhere(search, allLanguages),
    };

    while (true) {
        const keys: CsvExportKeyRow[] = await prisma.translationKey.findMany({
            where: whereClause,
            select: {
                id: true,
                stringName: true,
                remarks: true,
                values: {
                    where: { languageCode: { in: allLanguages } },
                    select: { languageCode: true, content: true },
                },
            },
            orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
            take: CSV_EXPORT_BATCH_SIZE,
            ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        });

        if (keys.length === 0) break;

        for (const key of keys) {
            yield buildCsvRow(key, baseLanguage, targetLangs);
        }

        cursor = keys[keys.length - 1]?.id;
        if (keys.length < CSV_EXPORT_BATCH_SIZE) break;
    }
}

export async function createCsvExportStream(
    projectId: string,
    options: CsvExportOptions = {}
): Promise<{ stream: ReadableStream<Uint8Array>; fileName: string }> {
    const scope = await getCsvExportScope(projectId, options);
    const encoder = new TextEncoder();
    const iterator = generateCsvChunks(projectId, scope)[Symbol.asyncIterator]();

    const stream = new ReadableStream<Uint8Array>({
        async pull(controller) {
            try {
                const next = await iterator.next();
                if (next.done) {
                    controller.close();
                    return;
                }

                controller.enqueue(encoder.encode(next.value));
            } catch (error) {
                controller.error(error);
            }
        },
        async cancel() {
            await iterator.return?.();
        },
    });

    return { stream, fileName: scope.fileName };
}

async function getPullExportScope(
    projectId: string,
    format: PullProjectFormat,
    lang?: string
): Promise<PullExportScope> {
    const project = await prisma.project.findUnique({
        where: { id: projectId },
        select: { baseLanguage: true, targetLanguages: true },
    });

    if (!project) throw new AppError('PROJECT_NOT_FOUND');

    const { baseLanguage, allLanguages } = getProjectLanguageCodes(project);
    const targetLang = lang || baseLanguage;
    const isFullJson = format === 'json' && !lang;
    const requestedLanguages = isFullJson
        ? allLanguages
        : uniqueLanguageCodes([targetLang, baseLanguage]);

    return {
        format,
        isFullJson,
        baseLanguage,
        targetLang,
        allLanguages,
        requestedLanguages,
        contentType: format === 'xml' ? 'application/xml' : 'application/json',
    };
}

async function* generatePullKeyRows(projectId: string, requestedLanguages: string[]) {
    let cursor: string | undefined;

    while (true) {
        const keys: PullExportKeyRow[] = await prisma.translationKey.findMany({
            where: { projectId },
            select: {
                id: true,
                stringName: true,
                values: {
                    where: { languageCode: { in: requestedLanguages } },
                    select: { languageCode: true, content: true },
                },
            },
            orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
            take: PULL_EXPORT_BATCH_SIZE,
            ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        });

        if (keys.length === 0) break;

        for (const key of keys) {
            yield key;
        }

        cursor = keys[keys.length - 1]?.id;
        if (keys.length < PULL_EXPORT_BATCH_SIZE) break;
    }
}

async function* generatePullProjectChunks(projectId: string, scope: PullExportScope) {
    if (scope.format === 'xml') {
        yield '<?xml version="1.0" encoding="utf-8"?>\n<resources>\n';

        for await (const key of generatePullKeyRows(projectId, scope.requestedLanguages)) {
            const values = getTranslationValueMap(key);
            const value = values.get(scope.targetLang) || values.get(scope.baseLanguage) || '';
            yield formatXmlStringResource(key.stringName, value) + '\n';
        }

        yield '</resources>\n';
        return;
    }

    let hasEntries = false;

    for await (const key of generatePullKeyRows(projectId, scope.requestedLanguages)) {
        const entry = scope.isFullJson
            ? formatFullJsonPullEntry(key, scope.allLanguages)
            : formatSingleJsonPullEntry(key, scope.targetLang, scope.baseLanguage);

        if (!entry) continue;

        if (!hasEntries) {
            yield '{\n';
            hasEntries = true;
        } else {
            yield ',\n';
        }

        yield entry;
    }

    yield hasEntries ? '\n}' : '{}';
}

export async function createPullProjectTranslationsStream(
    projectId: string,
    format: PullProjectFormat,
    lang?: string
): Promise<{ stream: ReadableStream<Uint8Array>; contentType: string }> {
    const scope = await getPullExportScope(projectId, format, lang);
    const encoder = new TextEncoder();
    const iterator = generatePullProjectChunks(projectId, scope)[Symbol.asyncIterator]();

    const stream = new ReadableStream<Uint8Array>({
        async pull(controller) {
            try {
                const next = await iterator.next();
                if (next.done) {
                    controller.close();
                    return;
                }

                controller.enqueue(encoder.encode(next.value));
            } catch (error) {
                controller.error(error);
            }
        },
        async cancel() {
            await iterator.return?.();
        },
    });

    return { stream, contentType: scope.contentType };
}

/**
 * Shared upsert logic for importing parsed strings into a project.
 */
async function importParsedStrings(
    projectId: string,
    parsedStrings: { name: string; value: string }[],
    baseLanguage: string,
    userId: string
): Promise<{ added: number; updated: number; skipped: number }> {
    // Verify the user exists to prevent FK constraint violations
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
        throw new AppError('USER_NOT_FOUND');
    }

    const stringNames = Array.from(new Set(parsedStrings.map((s) => s.name)));

    const existingKeys = await prisma.translationKey.findMany({
        where: { projectId, stringName: { in: stringNames } },
        select: {
            id: true,
            stringName: true,
            remarks: true,
            values: {
                where: { languageCode: baseLanguage },
                select: {
                    languageCode: true,
                    content: true,
                },
            },
        },
    });

    const existingMap = new Map(existingKeys.map((k) => [k.stringName, k]));

    // Get current max sortOrder so new terms are added after existing ones
    const maxSortOrderResult = await prisma.translationKey.aggregate({
        where: { projectId },
        _max: { sortOrder: true },
    });
    const currentMaxOrder = maxSortOrderResult._max.sortOrder ?? -1;

    let added = 0;
    let updated = 0;
    let skipped = 0;
    const operations: Prisma.PrismaPromise<unknown>[] = [];
    const pendingNewKeys = new Map<string, { remarks: string[] }>();
    const pendingExistingRemarks = new Map<string, string[]>();

    for (let idx = 0; idx < parsedStrings.length; idx++) {
        const item = parsedStrings[idx];
        const { name: stringName, value: content } = item;
        const existingKey = existingMap.get(stringName);
        const pendingNewKey = pendingNewKeys.get(stringName);

        if (existingKey || pendingNewKey) {
            if (pendingNewKey) {
                const duplicateRemark = `[Imported Duplicate Value]: ${content} -- First imported value preserved at ${new Date().toISOString()}`;
                pendingNewKey.remarks.push(duplicateRemark);
                updated++;
                continue;
            }

            if (!existingKey) {
                skipped++;
                continue;
            }

            const baseValue = existingKey.values.find((v) => v.languageCode === baseLanguage);

            if (baseValue) {
                if (baseValue.content !== content) {
                    const newRemark = `[Imported Value]: ${content} -- Existing ${baseLanguage} preserved at ${new Date().toISOString()}`;
                    const existingRemarks = pendingExistingRemarks.get(existingKey.id) || [];
                    existingRemarks.push(newRemark);
                    pendingExistingRemarks.set(existingKey.id, existingRemarks);
                    updated++;
                } else {
                    skipped++;
                }
            } else {
                operations.push(
                    prisma.translationValue.create({
                        data: {
                            translationKeyId: existingKey.id,
                            languageCode: baseLanguage,
                            content,
                            lastModifiedById: userId,
                        },
                    })
                );
                updated++;
            }
        } else {
            // sortOrder = currentMax + 1 + idx, preserving file order
            pendingNewKeys.set(stringName, { remarks: [] });
            operations.push(
                prisma.translationKey.create({
                    data: {
                        projectId,
                        stringName,
                        remarks: null,
                        sortOrder: currentMaxOrder + 1 + idx,
                        lastModifiedById: userId,
                        values: {
                            create: {
                                languageCode: baseLanguage,
                                content,
                                lastModifiedById: userId,
                            },
                        },
                    },
                })
            );
            added++;
        }
    }

    if (operations.length > 0) {
        // Split into smaller transactions to reduce SQLite write-lock duration
        const CHUNK_SIZE = 100;
        for (let i = 0; i < operations.length; i += CHUNK_SIZE) {
            const chunk = operations.slice(i, i + CHUNK_SIZE);
            await prisma.$transaction(chunk);
        }
    }

    if (pendingExistingRemarks.size > 0) {
        for (const existingKey of existingKeys) {
            const appendedRemarks = pendingExistingRemarks.get(existingKey.id);
            if (!appendedRemarks || appendedRemarks.length === 0) continue;

            await prisma.translationKey.update({
                where: { id: existingKey.id },
                data: {
                    remarks: existingKey.remarks
                        ? existingKey.remarks + '\n' + appendedRemarks.join('\n')
                        : appendedRemarks.join('\n'),
                    lastModifiedById: userId,
                },
            });
        }
    }

    if (pendingNewKeys.size > 0) {
        for (const [stringName, pending] of pendingNewKeys.entries()) {
            if (pending.remarks.length === 0) continue;

            await prisma.translationKey.update({
                where: { projectId_stringName: { projectId, stringName } },
                data: {
                    remarks: pending.remarks.join('\n'),
                    lastModifiedById: userId,
                },
            });
        }
    }

    return { added, updated, skipped };
}

/**
 * Import an Android XML strings file into a project.
 */
export async function importXml(
    projectId: string,
    xmlContent: string,
    baseLanguage: string,
    userId: string
): Promise<{ added: number; updated: number; skipped: number }> {
    const parser = new AndroidXmlParser();
    const parsedStrings = parser.parse(xmlContent);
    return importParsedStrings(projectId, parsedStrings, baseLanguage, userId);
}

/**
 * Import an H5 flat JSON localization file into a project.
 */
export async function importJson(
    projectId: string,
    jsonContent: string,
    baseLanguage: string,
    userId: string
): Promise<{ added: number; updated: number; skipped: number }> {
    const parser = new H5JsonParser();
    const parsedStrings = parser.parse(jsonContent);
    return importParsedStrings(projectId, parsedStrings, baseLanguage, userId);
}

/**
 * Import an iOS Localizable.strings file into a project.
 */
export async function importIOSStrings(
    projectId: string,
    stringsContent: string,
    baseLanguage: string,
    userId: string
): Promise<{ added: number; updated: number; skipped: number }> {
    const parser = new IOSStringsParser();
    const parsedStrings = parser.parse(stringsContent);
    return importParsedStrings(projectId, parsedStrings, baseLanguage, userId);
}

/**
 * Auto-detect file format and import accordingly.
 * Supports: .xml (Android), .json (H5 flat JSON), .strings (iOS Localizable.strings)
 */
export async function importFile(
    projectId: string,
    fileContent: string,
    fileName: string,
    baseLanguage: string,
    userId: string
): Promise<{ added: number; updated: number; skipped: number; format: string }> {
    const ext = fileName.split('.').pop()?.toLowerCase();

    if (ext === 'xml') {
        const result = await importXml(projectId, fileContent, baseLanguage, userId);
        return { ...result, format: 'xml' };
    }

    if (ext === 'json') {
        const result = await importJson(projectId, fileContent, baseLanguage, userId);
        return { ...result, format: 'json' };
    }

    if (ext === 'strings') {
        const result = await importIOSStrings(projectId, fileContent, baseLanguage, userId);
        return { ...result, format: 'strings' };
    }

    throw new AppError('UNSUPPORTED_FILE_FORMAT', { details: { extension: ext } });
}

/**
 * Export a project's translations as a CSV string.
 */
export async function exportCsv(
    projectId: string,
    options: CsvExportOptions = {}
): Promise<{ csvContent: string; fileName: string }> {
    const scope = await getCsvExportScope(projectId, options);
    let csvContent = '';

    for await (const chunk of generateCsvChunks(projectId, scope)) {
        csvContent += chunk;
    }

    return { csvContent, fileName: scope.fileName };
}

/**
 * Pull project translations for developer API.
 * Mode A: format=json, no lang → full dump { key: { lang: val, ... }, ... }
 * Mode B: format=json, lang given → { key: val, ... } with base fallback
 * Mode C: format=xml, lang given → Android XML string
 */
export async function pullProjectTranslations(
    projectId: string,
    format: 'json' | 'xml',
    lang?: string
): Promise<{ data: string; contentType: string }> {
    const scope = await getPullExportScope(projectId, format, lang);
    let data = '';

    for await (const chunk of generatePullProjectChunks(projectId, scope)) {
        data += chunk;
    }

    return { data, contentType: scope.contentType };
}
