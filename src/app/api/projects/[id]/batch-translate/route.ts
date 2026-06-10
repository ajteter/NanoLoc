import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getProject } from '@/lib/services/project.service';
import { batchTranslateProject } from '@/lib/services/translate.service';
import { logAudit } from '@/lib/services/audit.service';
import { getProjectLanguageCodes, normalizeTargetLanguages } from '@/lib/language-utils';
import { jsonError, jsonErrorFromUnknown } from '@/lib/api/responses';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await auth();
    if (!session?.user) {
        return jsonError('UNAUTHORIZED');
    }

    const { id } = await params;

    const project = await getProject(id);
    if (!project) return jsonError('PROJECT_NOT_FOUND');

    const userId = session.user.id;
    if (!userId) {
        return jsonError('SESSION_USER_MISSING');
    }

    try {
        let targetLanguages: string[] = [];

        // The client may send an empty POST body, so guard against JSON parse failure
        let body: Record<string, unknown> = {};
        try {
            body = await request.json();
        } catch {
            // No body sent — that's fine, we'll use the project's configured languages
        }

        const { baseLanguage, targetLanguages: configuredTargetLanguages } = getProjectLanguageCodes(project);

        if (body.targetLanguages && Array.isArray(body.targetLanguages)) {
            targetLanguages = normalizeTargetLanguages(body.targetLanguages, baseLanguage);
        } else {
            targetLanguages = configuredTargetLanguages;
        }

        if (!Array.isArray(targetLanguages) || targetLanguages.length === 0) {
            return jsonError('NO_TARGET_LANGUAGES');
        }

        const translated = await batchTranslateProject(id, targetLanguages, userId, targetLanguages.length === 1 ? 'column' : 'batch');
        logAudit({ action: 'BATCH_TRANSLATE', userId, projectId: id, projectName: project.name, details: { languages: targetLanguages, results: translated } });
        return NextResponse.json({ success: true, translated });
    } catch (error: unknown) {
        console.error("Batch translate error:", error);
        return jsonErrorFromUnknown(error, 'TRANSLATION_FAILED');
    }
}
