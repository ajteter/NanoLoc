import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { listTerms, createTerm, getProject, ConflictError } from '@/lib/services/project.service';
import { logAudit } from '@/lib/services/audit.service';
import { createTermSchema } from '@/lib/validators/term.schema';
import { getProjectLanguageCodes } from '@/lib/language-utils';
import { jsonError, jsonErrorFromUnknown, jsonValidationError } from '@/lib/api/responses';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await auth();
    if (!session?.user) {
        return jsonError('UNAUTHORIZED');
    }

    const { id } = await params;

    const project = await getProject(id);
    if (!project) return jsonError('PROJECT_NOT_FOUND');

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';

    try {
        const { allLanguages } = getProjectLanguageCodes(project);
        const result = await listTerms(id, {
            page,
            limit,
            search,
            displayLanguages: allLanguages,
            searchLanguages: allLanguages,
        });
        return NextResponse.json(result);
    } catch (error) {
        console.error("Fetch terms error:", error);
        return jsonErrorFromUnknown(error, 'TERM_UPDATE_FAILED');
    }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await auth();
    if (!session?.user) {
        return jsonError('UNAUTHORIZED');
    }

    const { id } = await params;

    const project = await getProject(id);
    if (!project) return jsonError('PROJECT_NOT_FOUND');

    // Resolve userId from session for audit
    const userId = session.user.id;
    if (!userId) {
        return jsonError('SESSION_USER_MISSING');
    }

    try {
        const body = await request.json();
        const result = createTermSchema.safeParse(body);

        if (!result.success) {
            return jsonValidationError(result.error.issues);
        }

        const term = await createTerm(id, result.data, userId);
        logAudit({ action: 'CREATE_TERM', userId, projectId: id, projectName: project.name, keyName: result.data.stringName });
        return NextResponse.json({ term }, { status: 201 });
    } catch (error) {
        if (error instanceof ConflictError) {
            return jsonError('TERM_KEY_EXISTS');
        }
        console.error("Create term error:", error);
        return jsonErrorFromUnknown(error, 'TERM_CREATE_FAILED');
    }
}
