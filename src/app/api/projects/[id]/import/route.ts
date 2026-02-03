import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { AndroidXmlParser } from '@/lib/parsers/android-xml';

export async function POST(request: Request, { params }: { params: { id: string } }) {
    const session = await auth();
    if (!session?.user?.email) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: projectId } = await params;

    // Verify access
    const project = await prisma.project.findUnique({
        where: { id: projectId },
        include: { users: true }
    });

    if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const hasAccess = project.users.some(u => u.email === session.user?.email);
    if (!hasAccess) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    try {
        const formData = await request.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
        }

        const text = await file.text();
        const parser = new AndroidXmlParser();
        const parsedStrings = parser.parse(text);

        let added = 0;
        let updated = 0;
        let skipped = 0;

        for (const item of parsedStrings) {
            const { name: stringName, value: content } = item;

            // Check existing Key
            const existingKey = await prisma.translationKey.findUnique({
                where: {
                    projectId_stringName: {
                        projectId,
                        stringName
                    }
                },
                include: {
                    values: true
                }
            });

            if (existingKey) {
                // Check base language value
                const baseValue = existingKey.values.find(v => v.languageCode === project.baseLanguage);

                if (baseValue) {
                    if (baseValue.content !== content) {
                        // Conflict! Update value and add remark
                        const oldContent = baseValue.content;
                        const newRemark = `[Old Value]: ${oldContent} -- Updated at ${new Date().toISOString()}`;

                        await prisma.translationValue.update({
                            where: { id: baseValue.id },
                            data: { content }
                        });

                        await prisma.translationKey.update({
                            where: { id: existingKey.id },
                            data: {
                                remarks: existingKey.remarks ? existingKey.remarks + "\n" + newRemark : newRemark
                            }
                        });
                        updated++;
                    } else {
                        skipped++; // Identical
                    }
                } else {
                    // Key exists but no base value? (Should not happen usually but handle it)
                    await prisma.translationValue.create({
                        data: {
                            translationKeyId: existingKey.id,
                            languageCode: project.baseLanguage,
                            content
                        }
                    });
                    updated++;
                }
            } else {
                // New Key
                await prisma.translationKey.create({
                    data: {
                        projectId,
                        stringName,
                        values: {
                            create: {
                                languageCode: project.baseLanguage,
                                content
                            }
                        }
                    }
                });
                added++;
            }
        }

        return NextResponse.json({ success: true, added, updated, skipped });

    } catch (error: any) {
        console.error("Import error:", error);
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
    }
}
