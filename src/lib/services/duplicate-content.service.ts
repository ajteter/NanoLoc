import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';

export interface DuplicateTranslationTerm {
    id: string;
    stringName: string;
    remarks: string | null;
    content: string;
}

export interface DuplicateTranslationGroup {
    content: string;
    normalizedContent: string;
    count: number;
    terms: DuplicateTranslationTerm[];
}

export interface DuplicateTranslationResult {
    languageCode: string;
    totalDuplicateGroups: number;
    totalDuplicateTerms: number;
    groups: DuplicateTranslationGroup[];
}

interface DuplicateContentRow {
    id: string;
    stringName: string;
    remarks: string | null;
    content: string;
    sortOrder: number;
}

interface ExactDuplicateContentRow extends DuplicateContentRow {
    normalizedContent: string;
    groupContent: string;
    groupCount: number | bigint;
}

export async function findDuplicateTranslationContent({
    projectId,
    languageCode,
    ignoreCase = false,
}: {
    projectId: string;
    languageCode: string;
    ignoreCase?: boolean;
}): Promise<DuplicateTranslationResult> {
    if (ignoreCase) {
        // SQLite LOWER() is ASCII-only without ICU, so keep Unicode case folding in JS.
        const rows = await findLanguageContentRows(projectId, languageCode);
        return buildDuplicateResultFromRows(languageCode, rows, true);
    }

    const rows = await findExactDuplicateRows(projectId, languageCode);
    return buildDuplicateResultFromExactRows(languageCode, rows);
}

async function findLanguageContentRows(
    projectId: string,
    languageCode: string
): Promise<DuplicateContentRow[]> {
    return prisma.$queryRaw<DuplicateContentRow[]>(Prisma.sql`
        SELECT
            tk."id" AS "id",
            tk."stringName" AS "stringName",
            tk."remarks" AS "remarks",
            tk."sortOrder" AS "sortOrder",
            TRIM(tv."content") AS "content"
        FROM "TranslationValue" tv
        INNER JOIN "TranslationKey" tk ON tk."id" = tv."translationKeyId"
        WHERE tk."projectId" = ${projectId}
            AND tv."languageCode" = ${languageCode}
            AND tv."content" IS NOT NULL
            AND TRIM(tv."content") <> ''
        ORDER BY tk."sortOrder" DESC, tk."stringName" ASC
    `);
}

async function findExactDuplicateRows(
    projectId: string,
    languageCode: string
): Promise<ExactDuplicateContentRow[]> {
    return prisma.$queryRaw<ExactDuplicateContentRow[]>(Prisma.sql`
        WITH scoped_values AS (
            SELECT
                tk."id" AS "id",
                tk."stringName" AS "stringName",
                tk."remarks" AS "remarks",
                tk."sortOrder" AS "sortOrder",
                TRIM(tv."content") AS "content",
                TRIM(tv."content") AS "normalizedContent"
            FROM "TranslationValue" tv
            INNER JOIN "TranslationKey" tk ON tk."id" = tv."translationKeyId"
            WHERE tk."projectId" = ${projectId}
                AND tv."languageCode" = ${languageCode}
                AND tv."content" IS NOT NULL
                AND TRIM(tv."content") <> ''
        ),
        duplicate_groups AS (
            SELECT
                "normalizedContent",
                MIN("content") AS "groupContent",
                COUNT(*) AS "groupCount"
            FROM scoped_values
            GROUP BY "normalizedContent"
            HAVING COUNT(*) > 1
        )
        SELECT
            scoped_values."id" AS "id",
            scoped_values."stringName" AS "stringName",
            scoped_values."remarks" AS "remarks",
            scoped_values."sortOrder" AS "sortOrder",
            scoped_values."content" AS "content",
            scoped_values."normalizedContent" AS "normalizedContent",
            duplicate_groups."groupContent" AS "groupContent",
            duplicate_groups."groupCount" AS "groupCount"
        FROM scoped_values
        INNER JOIN duplicate_groups
            ON duplicate_groups."normalizedContent" = scoped_values."normalizedContent"
        ORDER BY duplicate_groups."groupCount" DESC, duplicate_groups."groupContent" ASC, scoped_values."sortOrder" DESC, scoped_values."stringName" ASC
    `);
}

function buildDuplicateResultFromRows(
    languageCode: string,
    rows: DuplicateContentRow[],
    ignoreCase: boolean
): DuplicateTranslationResult {
    const grouped = new Map<string, DuplicateTranslationGroup>();

    for (const row of rows) {
        const content = row.content;
        const normalizedContent = ignoreCase ? content.toLocaleLowerCase() : content;
        const group = grouped.get(normalizedContent);
        const entry: DuplicateTranslationTerm = {
            id: row.id,
            stringName: row.stringName,
            remarks: row.remarks,
            content,
        };

        if (group) {
            group.terms.push(entry);
            group.count = group.terms.length;
        } else {
            grouped.set(normalizedContent, {
                content,
                normalizedContent,
                count: 1,
                terms: [entry],
            });
        }
    }

    return finalizeDuplicateResult(languageCode, grouped);
}

function buildDuplicateResultFromExactRows(
    languageCode: string,
    rows: ExactDuplicateContentRow[]
): DuplicateTranslationResult {
    const grouped = new Map<string, DuplicateTranslationGroup>();

    for (const row of rows) {
        const group = grouped.get(row.normalizedContent);
        const entry: DuplicateTranslationTerm = {
            id: row.id,
            stringName: row.stringName,
            remarks: row.remarks,
            content: row.content,
        };

        if (group) {
            group.terms.push(entry);
        } else {
            grouped.set(row.normalizedContent, {
                content: row.groupContent,
                normalizedContent: row.normalizedContent,
                count: Number(row.groupCount),
                terms: [entry],
            });
        }
    }

    return finalizeDuplicateResult(languageCode, grouped);
}

function finalizeDuplicateResult(
    languageCode: string,
    grouped: Map<string, DuplicateTranslationGroup>
): DuplicateTranslationResult {
    const groups = Array.from(grouped.values())
        .filter((group) => group.count > 1)
        .sort((a, b) => b.count - a.count || a.content.localeCompare(b.content));

    return {
        languageCode,
        totalDuplicateGroups: groups.length,
        totalDuplicateTerms: groups.reduce((sum, group) => sum + group.count, 0),
        groups,
    };
}
