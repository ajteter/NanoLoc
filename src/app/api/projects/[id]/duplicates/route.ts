import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getProject } from '@/lib/services/project.service';
import { findDuplicateTranslationContent } from '@/lib/services/duplicate-content.service';
import { getProjectLanguageCodes } from '@/lib/language-utils';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await auth();
    if (!session?.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const project = await getProject(id);
    if (!project) {
        return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const languageCode = searchParams.get('lang');
    const ignoreCase = searchParams.get('ignoreCase') === 'true';

    if (!languageCode) {
        return NextResponse.json({ error: 'Missing lang parameter' }, { status: 400 });
    }

    const { allLanguages } = getProjectLanguageCodes(project);
    if (!allLanguages.includes(languageCode)) {
        return NextResponse.json({ error: 'Language is not configured for this project' }, { status: 400 });
    }

    const result = await findDuplicateTranslationContent({
        projectId: id,
        languageCode,
        ignoreCase,
    });

    return NextResponse.json(result);
}
