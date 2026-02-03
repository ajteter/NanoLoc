import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const updateProjectSchema = z.object({
    name: z.string().min(1).optional(),
    description: z.string().optional(),
    baseLanguage: z.string().optional(),
    targetLanguages: z.array(z.string()).optional(),
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
        include: { users: { select: { email: true } } }
    });

    if (!project) {
        return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Check access
    const hasAccess = project.users.some(u => u.email === session.user?.email);
    if (!hasAccess) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({ project });
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
        const hasAccess = project.users.some(u => u.email === session.user?.email);
        if (!hasAccess) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

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
    const hasAccess = project.users.some(u => u.email === session.user?.email);
    if (!hasAccess) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    await prisma.project.delete({ where: { id } });

    return NextResponse.json({ success: true });
}
