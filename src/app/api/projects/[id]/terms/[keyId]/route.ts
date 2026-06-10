import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getProject, updateTerm, deleteTerm } from '@/lib/services/project.service';
import { logAudit } from '@/lib/services/audit.service';
import { updateTermSchema } from '@/lib/validators/term.schema';
import { jsonError, jsonErrorFromUnknown, jsonValidationError } from '@/lib/api/responses';

export async function PUT(request: Request, { params }: { params: Promise<{ id: string; keyId: string }> }) {
    const session = await auth();
    if (!session?.user) {
        return jsonError('UNAUTHORIZED');
    }

    const { id, keyId } = await params;

    const project = await getProject(id);
    if (!project) return jsonError('PROJECT_NOT_FOUND');

    const userId = session.user.id;
    if (!userId) {
        return jsonError('SESSION_USER_MISSING');
    }

    try {
        const body = await request.json();
        const result = updateTermSchema.safeParse(body);

        if (!result.success) {
            return jsonValidationError(result.error.issues);
        }

        const updatedKey = await updateTerm(keyId, result.data, userId);
        const action = result.data.values ? 'UPDATE_TRANSLATION' : 'UPDATE_TERM';
        logAudit({
            action,
            userId,
            projectId: id,
            projectName: project.name,
            keyName: updatedKey?.stringName,
            details: result.data.values ? { languages: Object.keys(result.data.values) } : undefined,
        });
        return NextResponse.json({ term: updatedKey });
    } catch (error: unknown) {
        console.error("Update term error:", error);
        return jsonErrorFromUnknown(error, 'TERM_UPDATE_FAILED');
    }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string; keyId: string }> }) {
    const session = await auth();
    if (!session?.user) {
        return jsonError('UNAUTHORIZED');
    }

    const { id, keyId } = await params;

    const project = await getProject(id);
    if (!project) return jsonError('PROJECT_NOT_FOUND');

    try {
        await deleteTerm(keyId);
        logAudit({ action: 'DELETE_TERM', userId: session.user.id, projectId: id, projectName: project.name, keyName: keyId });
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Delete term error:", error);
        return jsonErrorFromUnknown(error, 'TERM_DELETE_FAILED');
    }
}
