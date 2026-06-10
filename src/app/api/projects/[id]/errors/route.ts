import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getProject } from '@/lib/services/project.service';
import { listProjectTranslationErrors } from '@/lib/services/translation-error.service';
import { jsonError, jsonErrorFromUnknown } from '@/lib/api/responses';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await auth();
    if (!session?.user?.id) {
        return jsonError('UNAUTHORIZED');
    }

    const { id } = await params;
    const project = await getProject(id);
    if (!project) {
        return jsonError('PROJECT_NOT_FOUND');
    }

    const url = new URL(request.url);
    const limitParam = Number(url.searchParams.get('limit') || '100');
    const limit = Number.isFinite(limitParam) ? Math.max(1, Math.min(limitParam, 200)) : 100;

    try {
        const errors = await listProjectTranslationErrors(id, limit);
        return NextResponse.json({ errors });
    } catch (error) {
        console.error('Error log API error:', error);
        return jsonErrorFromUnknown(error, 'ERROR_LOG_LOAD_FAILED');
    }
}
