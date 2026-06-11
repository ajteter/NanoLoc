import type { Prisma } from '@prisma/client';

export function normalizeTermSearch(search: string | null | undefined) {
    return search?.trim() ?? '';
}

export function buildTermSearchWhere(
    search: string | null | undefined,
    languageCodes?: string[]
): Prisma.TranslationKeyWhereInput | undefined {
    const normalizedSearch = normalizeTermSearch(search);
    if (!normalizedSearch) return undefined;

    const valueSearchClause: Prisma.TranslationValueWhereInput = {
        content: { contains: normalizedSearch },
    };

    if (languageCodes?.length) {
        valueSearchClause.languageCode = { in: languageCodes };
    }

    return {
        OR: [
            { stringName: { contains: normalizedSearch } },
            { remarks: { contains: normalizedSearch } },
            { values: { some: valueSearchClause } },
        ],
    };
}
