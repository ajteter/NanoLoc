import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getProject, updateTerm, deleteTerm } from '@/lib/services/project.service';
import { logAudit } from '@/lib/services/audit.service';

export async function PUT(request: Request, { params }: { params: Promise<{ id: string; keyId: string }> }) {
    const session = await auth();
    if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, keyId } = await params;

    const project = await getProject(id);
    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

    const userId = session.user.id;
    if (!userId) {
        return NextResponse.json({ error: "Session missing user ID" }, { status: 401 });
    }

    try {
        const body = await request.json();

        const stringName = typeof body.stringName === 'string' && body.stringName.length > 0 ? body.stringName : undefined;
        const remarks = typeof body.remarks === 'string' ? body.remarks : (body.remarks === null ? null : undefined);
        const values = body.values && typeof body.values === 'object' ? body.values : undefined;

        const updatedKey = await updateTerm(keyId, { stringName, remarks, values }, userId);
        const action = values ? 'UPDATE_TRANSLATION' : 'UPDATE_TERM';
        logAudit({ action, userId, projectId: id, projectName: project.name, keyName: updatedKey?.stringName, details: values ? { languages: Object.keys(values) } : undefined });
        return NextResponse.json({ term: updatedKey });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error("Update term error:", error);
        return NextResponse.json({ error: "Internal Server Error", details: message }, { status: 500 });
    }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string; keyId: string }> }) {
    const session = await auth();
    if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, keyId } = await params;

    const project = await getProject(id);
    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

    try {
        await deleteTerm(keyId);
        logAudit({ action: 'DELETE_TERM', userId: session.user.id, projectId: id, projectName: project.name, keyName: keyId });
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Delete term error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
