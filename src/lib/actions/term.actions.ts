'use server';

import { auth } from '@/auth';
import { revalidatePath } from 'next/cache';
import { createTerm, updateTerm, deleteTerm, getProject, clearTermTranslations } from '@/lib/services/project.service';
import { batchTranslateProject } from '@/lib/services/translate.service';
import { logAudit } from '@/lib/services/audit.service';
import { importFile } from '@/lib/services/storage.service';
import { getProjectLanguageCodes, normalizeTargetLanguages } from '@/lib/language-utils';
import { createTermSchema, updateTermSchema } from '@/lib/validators/term.schema';
import { AppError, toActionError, toValidationActionError, type ApiErrorCode } from '@/lib/api/errors';
import type { CreateTermInput, UpdateTermInput } from '@/lib/validators/term.schema';
import type { TranslationErrorSource } from '@/lib/services/translation-error.service';

export type ActionResult<T = Record<string, unknown>> =
    | ({ success: true } & T)
    | { success: false; error: string; code: ApiErrorCode; details?: unknown };

export async function createTermAction(projectId: string, data: CreateTermInput): Promise<ActionResult> {
    const session = await auth();
    if (!session?.user?.id) return { success: false, ...toActionError(new AppError('UNAUTHORIZED'), 'UNAUTHORIZED') };

    try {
        const result = createTermSchema.safeParse(data);
        if (!result.success) {
            return { success: false, ...toValidationActionError(result.error.issues) };
        }

        const term = await createTerm(projectId, result.data, session.user.id);
        revalidatePath(`/projects/${projectId}`);
        return { success: true, term };
    } catch (error) {
        return { success: false, ...toActionError(error, 'TERM_CREATE_FAILED') };
    }
}

export async function updateTermAction(projectId: string, keyId: string, data: UpdateTermInput): Promise<ActionResult> {
    const session = await auth();
    if (!session?.user?.id) return { success: false, ...toActionError(new AppError('UNAUTHORIZED'), 'UNAUTHORIZED') };

    try {
        const result = updateTermSchema.safeParse(data);
        if (!result.success) {
            return { success: false, ...toValidationActionError(result.error.issues) };
        }

        const term = await updateTerm(keyId, result.data, session.user.id);
        revalidatePath(`/projects/${projectId}`);
        return { success: true, term };
    } catch (error) {
        return { success: false, ...toActionError(error, 'TERM_UPDATE_FAILED') };
    }
}

export async function deleteTermAction(projectId: string, keyId: string): Promise<ActionResult> {
    const session = await auth();
    if (!session?.user?.id) return { success: false, ...toActionError(new AppError('UNAUTHORIZED'), 'UNAUTHORIZED') };

    try {
        await deleteTerm(keyId);
        revalidatePath(`/projects/${projectId}`);
        return { success: true };
    } catch (error) {
        return { success: false, ...toActionError(error, 'TERM_DELETE_FAILED') };
    }
}

export async function batchTranslateAction(
    projectId: string,
    targetLanguages?: string[],
    source: Extract<TranslationErrorSource, 'batch' | 'column'> = 'batch'
): Promise<ActionResult> {
    const session = await auth();
    if (!session?.user?.id) return { success: false, ...toActionError(new AppError('UNAUTHORIZED'), 'UNAUTHORIZED') };

    try {
        const project = await getProject(projectId);
        if (!project) throw new AppError('PROJECT_NOT_FOUND');

        const { baseLanguage, targetLanguages: configuredTargetLanguages } = getProjectLanguageCodes(project);
        const langs = targetLanguages?.length
            ? normalizeTargetLanguages(targetLanguages, baseLanguage)
            : configuredTargetLanguages;
        if (!langs.length) throw new AppError('NO_TARGET_LANGUAGES');

        const translated = await batchTranslateProject(projectId, langs, session.user.id, source);
        await logAudit({ action: 'BATCH_TRANSLATE', userId: session.user.id, projectId, projectName: project.name, details: { languages: langs, results: translated } });

        revalidatePath(`/projects/${projectId}`);
        return { success: true, translated };
    } catch (error) {
        return { success: false, ...toActionError(error, 'TRANSLATION_FAILED') };
    }
}

export async function importFileAction(
    projectId: string,
    formData: FormData
): Promise<ActionResult<{ added: number; updated: number; skipped: number; format: string }>> {
    const session = await auth();
    if (!session?.user?.id) return { success: false, ...toActionError(new AppError('UNAUTHORIZED'), 'UNAUTHORIZED') };

    try {
        const project = await getProject(projectId);
        if (!project) throw new AppError('PROJECT_NOT_FOUND');

        const file = formData.get('file');
        if (!(file instanceof File)) throw new AppError('NO_FILE_UPLOADED');

        const fileContent = await file.text();
        const result = await importFile(projectId, fileContent, file.name, project.baseLanguage || 'en-US', session.user.id);

        await logAudit({ action: 'IMPORT_FILE', userId: session.user.id, projectId, projectName: project.name, details: result });

        revalidatePath(`/projects/${projectId}`);
        return { success: true, ...result };
    } catch (error) {
        return { success: false, ...toActionError(error, 'IMPORT_FAILED') };
    }
}

export async function clearTermTranslationsAction(projectId: string, keyId: string, baseLanguage: string): Promise<ActionResult> {
    const session = await auth();
    if (!session?.user?.id) return { success: false, ...toActionError(new AppError('UNAUTHORIZED'), 'UNAUTHORIZED') };

    try {
        const project = await getProject(projectId);
        if (!project) throw new AppError('PROJECT_NOT_FOUND');

        const term = await clearTermTranslations(keyId, baseLanguage, session.user.id);

        await logAudit({ action: 'UPDATE_TERM', userId: session.user.id, projectId, projectName: project.name, details: { key: term?.stringName, action: 'Cleared all non-base translations' } });

        revalidatePath(`/projects/${projectId}`);
        return { success: true };
    } catch (error) {
        return { success: false, ...toActionError(error, 'TERM_CLEAR_FAILED') };
    }
}
