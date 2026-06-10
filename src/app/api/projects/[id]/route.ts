import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getProject, updateProject, deleteProject } from '@/lib/services/project.service';
import { logAudit } from '@/lib/services/audit.service';
import { updateProjectSchema } from '@/lib/validators/project.schema';
import { jsonError, jsonErrorFromUnknown, jsonValidationError } from '@/lib/api/responses';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await auth();
    if (!session?.user) {
        return jsonError('UNAUTHORIZED');
    }

    const { id } = await params;
    const project = await getProject(id);

    if (!project) {
        return jsonError('PROJECT_NOT_FOUND');
    }

    return NextResponse.json({ project });
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await auth();
    if (!session?.user) {
        return jsonError('UNAUTHORIZED');
    }

    const { id } = await params;
    try {
        const existing = await getProject(id);
        if (!existing) return jsonError('PROJECT_NOT_FOUND');

        const body = await request.json();
        const result = updateProjectSchema.safeParse(body);

        if (!result.success) {
            return jsonValidationError(result.error.issues);
        }

        const updated = await updateProject(id, result.data);
        logAudit({ action: 'UPDATE_PROJECT', userId: session.user.id, projectId: id, projectName: updated.name, details: result.data });
        return NextResponse.json({ project: updated });
    } catch (error) {
        console.error("Update project error:", error);
        return jsonErrorFromUnknown(error, 'PROJECT_UPDATE_FAILED');
    }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await auth();
    if (!session?.user) {
        return jsonError('UNAUTHORIZED');
    }

    const { id } = await params;
    const existing = await getProject(id);
    if (!existing) return jsonError('PROJECT_NOT_FOUND');

    await deleteProject(id);
    logAudit({ action: 'DELETE_PROJECT', userId: session.user.id, projectId: id, projectName: existing.name });
    return NextResponse.json({ success: true });
}
