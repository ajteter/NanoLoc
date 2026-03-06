'use server';

import { auth } from '@/auth';
import { revalidatePath } from 'next/cache';
import { createTerm, updateTerm, deleteTerm, getProject } from '@/lib/services/project.service';
import { batchTranslateProject } from '@/lib/services/translate.service';
import { logAudit } from '@/lib/services/audit.service';
import { importFile } from '@/lib/services/storage.service';

export type ActionResult<T = Record<string, unknown>> =
    | ({ success: true } & T)
    | { success: false; error: string };

export async function createTermAction(projectId: string, data: { stringName: string; remarks?: string; values?: Record<string, string> }): Promise<ActionResult> {
    const session = await auth();
    if (!session?.user?.id) throw new Error("Unauthorized");

    try {
        const term = await createTerm(projectId, data, session.user.id);
        revalidatePath(`/projects/${projectId}`);
        return { success: true, term };
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to create term";
        return { success: false, error: message };
    }
}

export async function updateTermAction(projectId: string, keyId: string, data: { stringName?: string; remarks?: string | null; values?: Record<string, string> }): Promise<ActionResult> {
    const session = await auth();
    if (!session?.user?.id) throw new Error("Unauthorized");

    try {
        const term = await updateTerm(keyId, data, session.user.id);
        revalidatePath(`/projects/${projectId}`);
        return { success: true, term };
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to update term";
        return { success: false, error: message };
    }
}

export async function deleteTermAction(projectId: string, keyId: string): Promise<ActionResult> {
    const session = await auth();
    if (!session?.user?.id) throw new Error("Unauthorized");

    try {
        await deleteTerm(keyId);
        revalidatePath(`/projects/${projectId}`);
        return { success: true };
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to delete term";
        return { success: false, error: message };
    }
}

export async function batchTranslateAction(projectId: string, targetLanguages?: string[]): Promise<ActionResult> {
    const session = await auth();
    if (!session?.user?.id) throw new Error("Unauthorized");

    try {
        const project = await getProject(projectId);
        if (!project) throw new Error("Not found");

        const langs = targetLanguages?.length ? targetLanguages : JSON.parse(project.targetLanguages || '[]');
        if (!langs.length) throw new Error("No target languages configured");

        const translated = await batchTranslateProject(projectId, langs, session.user.id);
        await logAudit({ action: 'BATCH_TRANSLATE', userId: session.user.id, projectId, projectName: project.name, details: { languages: langs, results: translated } });

        revalidatePath(`/projects/${projectId}`);
        return { success: true, translated };
    } catch (error) {
        const message = error instanceof Error ? error.message : "Batch translation failed";
        return { success: false, error: message };
    }
}

export async function importFileAction(projectId: string, formData: FormData): Promise<ActionResult> {
    const session = await auth();
    if (!session?.user?.id) throw new Error("Unauthorized");

    try {
        const project = await getProject(projectId);
        if (!project) throw new Error("Not found");

        const file = formData.get('file') as File;
        if (!file) throw new Error("No file uploaded");

        const fileContent = await file.text();
        const result = await importFile(projectId, fileContent, file.name, project.baseLanguage || 'en-US', session.user.id);

        await logAudit({ action: 'IMPORT_FILE', userId: session.user.id, projectId, projectName: project.name, details: result });

        revalidatePath(`/projects/${projectId}`);
        return { success: true, ...result };
    } catch (error) {
        const message = error instanceof Error ? error.message : "Import failed";
        return { success: false, error: message };
    }
}

