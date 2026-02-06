import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { canEditProject, getSessionUserId } from '@/lib/project-access';
import { z } from 'zod';

const updateProjectSchema = z.object({
    name: z.string().min(1).optional(),
    description: z.string().optional(),
    baseLanguage: z.string().optional(),
    targetLanguages: z.array(z.string()).optional(),
    visibility: z.enum(['public', 'private']).optional(),
    aiBaseUrl: z.string().optional(),
    aiApiKey: z.string().optional(),
    aiModelId: z.string().optional(),
    systemPrompt: z.string().optional(),
});

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await auth();
    if (!session?.user?.email) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params; // Next.js 15 params are async

    const project = await prisma.project.findUnique({
        where: { id },
        include: { users: { select: { email: true } }, owner: { select: { id: true, email: true } } }
    });

    if (!project) {
        return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const currentUserId = await getSessionUserId(session);
    const canEdit = canEditProject(project, currentUserId);

    return NextResponse.json({ project, canEdit });
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await auth();
    if (!session?.user?.email) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params; // Next.js 15 params are async
    try {
        const project = await prisma.project.findUnique({
            where: { id },
            include: { users: true }
        });

        if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });
        const currentUserId = await getSessionUserId(session);
        if (!canEditProject(project, currentUserId)) return NextResponse.json({ error: "Forbidden: only owner can edit private project" }, { status: 403 });

        const body = await request.json();
        const result = updateProjectSchema.safeParse(body);

        if (!result.success) {
            return NextResponse.json({ error: result.error.issues }, { status: 400 });
        }

        const data: any = { ...result.data };
        if (data.targetLanguages) {
            data.targetLanguages = JSON.stringify(data.targetLanguages);
        }

        const updated = await prisma.project.update({
            where: { id },
            data
        });

        return NextResponse.json({ project: updated });
    } catch (error) {
        console.error("Update project error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await auth();
    if (!session?.user?.email) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params; // Next.js 15 params are async

    const project = await prisma.project.findUnique({
        where: { id },
        include: { users: true }
    });

    if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const currentUserId = await getSessionUserId(session);
    if (!canEditProject(project, currentUserId)) return NextResponse.json({ error: "Forbidden: only owner can delete this project" }, { status: 403 });

    await prisma.project.delete({ where: { id } });

    return NextResponse.json({ success: true });
}
