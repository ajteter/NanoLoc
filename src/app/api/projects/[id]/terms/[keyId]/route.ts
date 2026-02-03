import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const updateTermSchema = z.object({
    stringName: z.string().min(1).optional(),
    remarks: z.string().optional().nullable(),
    values: z.record(z.string()).optional(), // languageCode -> content
});

export async function PUT(request: Request, { params }: { params: { id: string; keyId: string } }) {
    const session = await auth();
    if (!session?.user?.email) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: projectId, keyId } = await params;

    const project = await prisma.project.findUnique({
        where: { id: projectId },
        include: { users: true }
    });

    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });
    const hasAccess = project.users.some(u => u.email === session.user?.email);
    if (!hasAccess) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    try {
        const body = await request.json();
        const result = updateTermSchema.safeParse(body);

        if (!result.success) {
            return NextResponse.json({ error: result.error.errors }, { status: 400 });
        }

        const { stringName, remarks, values } = result.data;

        // Transaction to update key and values
        await prisma.$transaction(async (tx) => {
            // 1. Update Key fields if provided
            if (stringName || remarks !== undefined) {
                await tx.translationKey.update({
                    where: { id: keyId },
                    data: {
                        stringName,
                        remarks
                    }
                });
            }

            // 2. Upsert values
            if (values) {
                const valuesTyped = values as Record<string, string>;
                for (const [lang, content] of Object.entries(valuesTyped)) {
                    // ... (rest is same, using content)
                    /* ... */

                    await tx.translationValue.upsert({
                        where: {
                            translationKeyId_languageCode: {
                                translationKeyId: keyId,
                                languageCode: lang
                            }
                        },
                        update: { content },
                        create: {
                            translationKeyId: keyId,
                            languageCode: lang,
                            content
                        }
                    });
                }
            }
        });

        const updatedKey = await prisma.translationKey.findUnique({
            where: { id: keyId },
            include: { values: true }
        });

        return NextResponse.json({ term: updatedKey });

    } catch (error) {
        console.error("Update term error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}


export async function DELETE(request: Request, { params }: { params: { id: string; keyId: string } }) {
    const session = await auth();
    if (!session?.user?.email) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: projectId, keyId } = await params;

    const project = await prisma.project.findUnique({
        where: { id: projectId },
        include: { users: true }
    });

    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });
    const hasAccess = project.users.some(u => u.email === session.user?.email);
    if (!hasAccess) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    try {
        await prisma.translationKey.delete({
            where: { id: keyId }
        });
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Delete term error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
