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

export async function findDuplicateTranslationContent({
    projectId,
    languageCode,
    ignoreCase = false,
}: {
    projectId: string;
    languageCode: string;
    ignoreCase?: boolean;
}): Promise<DuplicateTranslationResult> {
    const terms = await prisma.translationKey.findMany({
        where: {
            projectId,
            values: { some: { languageCode } },
        },
        select: {
            id: true,
            stringName: true,
            remarks: true,
            sortOrder: true,
            values: {
                where: { languageCode },
                select: { content: true },
            },
        },
        orderBy: { sortOrder: 'desc' },
    });

    const grouped = new Map<string, DuplicateTranslationGroup>();

    for (const term of terms) {
        const content = term.values[0]?.content?.trim();
        if (!content) continue;

        const normalizedContent = ignoreCase ? content.toLocaleLowerCase() : content;
        const group = grouped.get(normalizedContent);
        const entry: DuplicateTranslationTerm = {
            id: term.id,
            stringName: term.stringName,
            remarks: term.remarks,
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
