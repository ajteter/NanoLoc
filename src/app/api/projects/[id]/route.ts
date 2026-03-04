import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getProject, updateProject, deleteProject } from '@/lib/services/project.service';
import { logAudit } from '@/lib/services/audit.service';
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
    if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const project = await getProject(id);

    if (!project) {
        return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    return NextResponse.json({ project });
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await auth();
    if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    try {
        const existing = await getProject(id);
        if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

        const body = await request.json();
        const result = updateProjectSchema.safeParse(body);

        if (!result.success) {
            return NextResponse.json({ error: result.error.issues }, { status: 400 });
        }

        const updated = await updateProject(id, result.data);
        logAudit({ action: 'UPDATE_PROJECT', userId: session.user.id, projectId: id, projectName: updated.name, details: result.data });
        return NextResponse.json({ project: updated });
    } catch (error) {
        console.error("Update project error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await auth();
    if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const existing = await getProject(id);
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await deleteProject(id);
    logAudit({ action: 'DELETE_PROJECT', userId: session.user.id, projectId: id, projectName: existing.name });
    return NextResponse.json({ success: true });
}
