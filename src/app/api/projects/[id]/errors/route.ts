import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getProject } from '@/lib/services/project.service';
import { listProjectTranslationErrors } from '@/lib/services/translation-error.service';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const project = await getProject(id);
    if (!project) {
        return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const url = new URL(request.url);
    const limitParam = Number(url.searchParams.get('limit') || '100');
    const limit = Number.isFinite(limitParam) ? Math.max(1, Math.min(limitParam, 200)) : 100;

    const errors = await listProjectTranslationErrors(id, limit);
    return NextResponse.json({ errors });
}
