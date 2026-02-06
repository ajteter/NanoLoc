import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { canEditProject, getSessionUserId } from '@/lib/project-access';
import { AndroidXmlParser } from '@/lib/parsers/android-xml';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await auth();
    if (!session?.user?.email) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: projectId } = await params;

    // Verify edit access (public: anyone; private: only owner)
    const project = await prisma.project.findUnique({
        where: { id: projectId },
        include: { users: { select: { email: true, id: true } } }
    });

    if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const currentUserId = await getSessionUserId(session);
    if (!canEditProject(project, currentUserId)) return NextResponse.json({ error: "Forbidden: only owner can edit private project" }, { status: 403 });
    if (!currentUserId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const formData = await request.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
        }

        const text = await file.text();
        const parser = new AndroidXmlParser();
        const parsedStrings = parser.parse(text);

        // 1. Bulk Fetch Existing Keys
        // Extract all stringNames from the uploaded file
        const xmlStringNames = parsedStrings.map(s => s.name);

        // Fetch all existing keys that match these names in this project
        const existingKeys = await prisma.translationKey.findMany({
            where: {
                projectId: projectId,
                stringName: { in: xmlStringNames }
            },
            include: {
                values: true
            }
        });

        // Create a Map for O(1) lookup
        // Map<stringName, TranslationKey>
        const existingMap = new Map();
        existingKeys.forEach(k => existingMap.set(k.stringName, k));

        let added = 0;
        let updated = 0;
        let skipped = 0;

        const operations: any[] = [];

        // 2. In-Memory Comparison & Operation Prep
        for (const item of parsedStrings) {
            const { name: stringName, value: content } = item;
            const existingKey = existingMap.get(stringName);

            if (existingKey) {
                // Key Exists
                const baseValue = existingKey.values.find((v: any) => v.languageCode === project.baseLanguage);

                if (baseValue) {
                    if (baseValue.content !== content) {
                        // Conflict: Content changed
                        const oldContent = baseValue.content;
                        const newRemark = `[Old Value]: ${oldContent} -- Updated at ${new Date().toISOString()}`;

                        // Update Value
                        operations.push(prisma.translationValue.update({
                            where: { id: baseValue.id },
                            data: {
                                content,
                                lastModifiedById: currentUserId
                            }
                        }));

                        // Update Key Remarks
                        operations.push(prisma.translationKey.update({
                            where: { id: existingKey.id },
                            data: {
                                remarks: existingKey.remarks ? existingKey.remarks + "\n" + newRemark : newRemark,
                                lastModifiedById: currentUserId
                            }
                        }));
                        updated++;
                    } else {
                        // Content identical
                        skipped++;
                    }
                } else {
                    // Key exists but Base Value missing (Create Value)
                    operations.push(prisma.translationValue.create({
                        data: {
                            translationKeyId: existingKey.id,
                            languageCode: project.baseLanguage,
                            content,
                            lastModifiedById: currentUserId
                        }
                    }));
                    updated++; // Count as update/add content
                }
            } else {
                // New Key (Create Key + Value)
                // Note: creating keys individually in transaction is fine.
                operations.push(prisma.translationKey.create({
                    data: {
                        projectId,
                        stringName,
                        lastModifiedById: currentUserId,
                        values: {
                            create: {
                                languageCode: project.baseLanguage,
                                content,
                                lastModifiedById: currentUserId
                            }
                        }
                    }
                }));
                added++;
            }
        }

        // 3. Execute Transaction
        if (operations.length > 0) {
            await prisma.$transaction(operations);
        }

        return NextResponse.json({ success: true, added, updated, skipped });

    } catch (error: any) {
        console.error("Import error:", error);
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
    }
}
