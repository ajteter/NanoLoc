import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getProject } from '@/lib/services/project.service';
import { importFile } from '@/lib/services/storage.service';
import { logAudit } from '@/lib/services/audit.service';
import { jsonError, jsonErrorFromUnknown } from '@/lib/api/responses';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await auth();
    if (!session?.user) {
        return jsonError('UNAUTHORIZED');
    }

    const { id: projectId } = await params;

    const project = await getProject(projectId);
    if (!project) return jsonError('PROJECT_NOT_FOUND');

    const userId = session.user.id;
    if (!userId) {
        return jsonError('SESSION_USER_MISSING');
    }

    try {
        const formData = await request.formData();
        const file = formData.get('file') as File;

        if (!(file instanceof File)) {
            return jsonError('NO_FILE_UPLOADED');
        }

        const fileContent = await file.text();
        const result = await importFile(projectId, fileContent, file.name, project.baseLanguage, userId);
        logAudit({ action: 'IMPORT_FILE', userId, projectId, projectName: project.name, details: result });
        return NextResponse.json({ success: true, ...result });
    } catch (error: unknown) {
        console.error("Import error:", error);
        return jsonErrorFromUnknown(error, 'IMPORT_FAILED');
    }
}
