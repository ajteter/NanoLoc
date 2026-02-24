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
    const parser = new AndroidXmlParser();
    const parsedStrings = parser.parse(xmlContent);

    const xmlStringNames = parsedStrings.map((s) => s.name);

    const existingKeys = await prisma.translationKey.findMany({
        where: { projectId, stringName: { in: xmlStringNames } },
        include: { values: true },
    });

    const existingMap = new Map(existingKeys.map((k) => [k.stringName, k]));

    let added = 0;
    let updated = 0;
    let skipped = 0;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const operations: any[] = [];

    for (const item of parsedStrings) {
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
            operations.push(
                prisma.translationKey.create({
                    data: {
                        projectId,
                        stringName,
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
        await prisma.$transaction(operations);
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
        include: { keys: { include: { values: true } } },
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
