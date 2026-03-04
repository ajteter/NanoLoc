import { prisma } from '@/lib/prisma';
import { AndroidXmlParser } from '@/lib/parsers/android-xml';

/**
 * Import an Android XML strings file into a project.
 * Returns counts of added, updated, and skipped terms.
 */
export async function importXml(
    projectId: string,
    xmlContent: string,
    baseLanguage: string,
    userId: string
): Promise<{ added: number; updated: number; skipped: number }> {
    // Verify the user exists to prevent FK constraint violations
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
        throw new Error(`Import failed: user ID "${userId}" not found. Please log out and log back in.`);
    }

    const parser = new AndroidXmlParser();
    const parsedStrings = parser.parse(xmlContent);

    const xmlStringNames = parsedStrings.map((s) => s.name);

    const existingKeys = await prisma.translationKey.findMany({
        where: { projectId, stringName: { in: xmlStringNames } },
        include: { values: true },
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const operations: any[] = [];

    for (let xmlIndex = 0; xmlIndex < parsedStrings.length; xmlIndex++) {
        const item = parsedStrings[xmlIndex];
        const { name: stringName, value: content } = item;
        const existingKey = existingMap.get(stringName);

        if (existingKey) {
            const baseValue = existingKey.values.find(
                (v: { languageCode: string }) => v.languageCode === baseLanguage
            );

            if (baseValue) {
                if (baseValue.content !== content) {
                    const oldContent = baseValue.content;
                    const newRemark = `[Old Value]: ${oldContent} -- Updated at ${new Date().toISOString()}`;

                    operations.push(
                        prisma.translationValue.update({
                            where: { id: baseValue.id },
                            data: { content, lastModifiedById: userId },
                        })
                    );

                    operations.push(
                        prisma.translationKey.update({
                            where: { id: existingKey.id },
                            data: {
                                remarks: existingKey.remarks
                                    ? existingKey.remarks + '\n' + newRemark
                                    : newRemark,
                                lastModifiedById: userId,
                            },
                        })
                    );
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
            // sortOrder = currentMax + 1 + xmlIndex, preserving XML order
            operations.push(
                prisma.translationKey.create({
                    data: {
                        projectId,
                        stringName,
                        sortOrder: currentMaxOrder + 1 + xmlIndex,
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

    return { added, updated, skipped };
}

/**
 * Export a project's translations as a CSV string.
 */
export async function exportCsv(
    projectId: string
): Promise<{ csvContent: string; fileName: string }> {
    const project = await prisma.project.findUnique({
        where: { id: projectId },
        include: {
            keys: {
                include: { values: true },
                orderBy: { sortOrder: 'asc' },
            },
        },
    });

    if (!project) throw new Error('Project not found');

    let targetLangs: string[] = [];
    try {
        targetLangs = JSON.parse(project.targetLanguages || '[]');
    } catch {
        targetLangs = [];
    }

    const header = ['Key', project.baseLanguage, ...targetLangs];

    const rows = project.keys.map((key) => {
        const row: string[] = [key.stringName];

        const baseVal =
            key.values.find((v) => v.languageCode === project.baseLanguage)?.content || '';
        row.push(baseVal);

        targetLangs.forEach((lang) => {
            const val = key.values.find((v) => v.languageCode === lang)?.content || '';
            row.push(val);
        });

        return row;
    });

    const escapeCsv = (str: string) => {
        if (str === null || str === undefined) return '';
        const s = String(str);
        if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
            return `"${s.replace(/"/g, '""')}"`;
        }
        return s;
    };

    let csvContent = '\uFEFF' + header.map(escapeCsv).join(',') + '\n';
    rows.forEach((r) => {
        csvContent += r.map(escapeCsv).join(',') + '\n';
    });

    const safeName = project.name.replace(/[^a-z0-9 \-_.]/gi, '_').trim();

    return { csvContent, fileName: `${safeName}_export.csv` };
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
    const project = await prisma.project.findUnique({
        where: { id: projectId },
        include: {
            keys: {
                include: { values: true },
                orderBy: { sortOrder: 'asc' },
            },
        },
    });

    if (!project) throw new Error('Project not found');

    const allLangs: string[] = [project.baseLanguage];
    try {
        const targets = JSON.parse(project.targetLanguages || '[]');
        allLangs.push(...targets);
    } catch { }

    if (format === 'json' && !lang) {
        // Mode A: Full dump
        const result: Record<string, Record<string, string>> = {};
        for (const key of project.keys) {
            const entry: Record<string, string> = {};
            for (const l of allLangs) {
                const val = key.values.find(v => v.languageCode === l)?.content;
                if (val) entry[l] = val;
            }
            result[key.stringName] = entry;
        }
        return { data: JSON.stringify(result, null, 2), contentType: 'application/json' };
    }

    if (format === 'json' && lang) {
        // Mode B: Single language JSON with base fallback
        const result: Record<string, string> = {};
        for (const key of project.keys) {
            const val = key.values.find(v => v.languageCode === lang)?.content
                || key.values.find(v => v.languageCode === project.baseLanguage)?.content
                || '';
            if (val) result[key.stringName] = val;
        }
        return { data: JSON.stringify(result, null, 2), contentType: 'application/json' };
    }

    if (format === 'xml') {
        // Mode C: Android XML
        const targetLang = lang || project.baseLanguage;
        const escapeXml = (s: string) =>
            s.replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, "\\'");

        let xml = '<?xml version="1.0" encoding="utf-8"?>\n<resources>\n';
        for (const key of project.keys) {
            const val = key.values.find(v => v.languageCode === targetLang)?.content
                || key.values.find(v => v.languageCode === project.baseLanguage)?.content
                || '';
            xml += `    <string name="${escapeXml(key.stringName)}">${escapeXml(val)}</string>\n`;
        }
        xml += '</resources>\n';
        return { data: xml, contentType: 'application/xml' };
    }

    throw new Error('Invalid format');
}
