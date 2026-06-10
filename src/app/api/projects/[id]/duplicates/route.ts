import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getProject } from '@/lib/services/project.service';
import { findDuplicateTranslationContent } from '@/lib/services/duplicate-content.service';
import { getProjectLanguageCodes } from '@/lib/language-utils';
import { jsonError, jsonErrorFromUnknown } from '@/lib/api/responses';

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

    const { searchParams } = new URL(request.url);
    const languageCode = searchParams.get('lang');
    const ignoreCase = searchParams.get('ignoreCase') === 'true';

    if (!languageCode) {
        return jsonError('MISSING_LANGUAGE');
    }

    const { allLanguages } = getProjectLanguageCodes(project);
    if (!allLanguages.includes(languageCode)) {
        return jsonError('LANGUAGE_NOT_CONFIGURED');
    }

    try {
        const result = await findDuplicateTranslationContent({
            projectId: id,
            languageCode,
            ignoreCase,
        });

        return NextResponse.json(result);
    } catch (error) {
        console.error('Duplicate check error:', error);
        return jsonErrorFromUnknown(error, 'DUPLICATE_CHECK_FAILED');
    }
}
