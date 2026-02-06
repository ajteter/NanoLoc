import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { canEditProject, getSessionUserId } from '@/lib/project-access';
import { z } from 'zod';

export async function PUT(request: Request, { params }: { params: Promise<{ id: string; keyId: string }> }) {
    const session = await auth();
    if (!session?.user?.email) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, keyId } = await params;

    const project = await prisma.project.findUnique({
        where: { id },
        include: { users: true }
    });

    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });
    const currentUserId = await getSessionUserId(session);
    if (!canEditProject(project, currentUserId)) return NextResponse.json({ error: "Forbidden: only owner can edit private project" }, { status: 403 });
    if (!currentUserId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const body = await request.json();

        // Manual validation instead of Zod to avoid runtime issues
        const stringName = typeof body.stringName === 'string' && body.stringName.length > 0 ? body.stringName : undefined;
        const remarks = typeof body.remarks === 'string' ? body.remarks : (body.remarks === null ? null : undefined);
        const values = body.values && typeof body.values === 'object' ? body.values : undefined;

        // Transaction to update key and values
        await prisma.$transaction(async (tx) => {
            // 1. Update Key fields if provided
            if (stringName || remarks !== undefined) {
                await tx.translationKey.update({
                    where: { id: keyId },
                    data: {
                        stringName,
                        remarks,
                        lastModifiedById: currentUserId // Audit
                    }
                });
            }

            // 2. Upsert values
            if (values) {
                const valuesTyped = values as Record<string, string>;
                for (const [lang, content] of Object.entries(valuesTyped)) {
                    await tx.translationValue.upsert({
                        where: {
                            translationKeyId_languageCode: {
                                translationKeyId: keyId,
                                languageCode: lang
                            }
                        },
                        update: {
                            content,
                            lastModifiedById: currentUserId // Audit
                        },
                        create: {
                            translationKeyId: keyId,
                            languageCode: lang,
                            content,
                            lastModifiedById: currentUserId // Audit
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

    } catch (error: any) {
        console.error("Update term error:", error);
        return NextResponse.json({ error: "Internal Server Error", details: error.message, stack: error.stack }, { status: 500 });
    }
}


export async function DELETE(request: Request, { params }: { params: Promise<{ id: string; keyId: string }> }) {
    const session = await auth();
    if (!session?.user?.email) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, keyId } = await params;

    const project = await prisma.project.findUnique({
        where: { id },
        include: { users: true }
    });

    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });
    const currentUserId = await getSessionUserId(session);
    if (!canEditProject(project, currentUserId)) return NextResponse.json({ error: "Forbidden: only owner can edit private project" }, { status: 403 });

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
