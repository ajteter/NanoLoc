'use server';

import { auth } from '@/auth';
import { revalidatePath } from 'next/cache';
import { createTerm, updateTerm, deleteTerm, getProject } from '@/lib/services/project.service';
import { batchTranslateProject } from '@/lib/services/translate.service';
import { logAudit } from '@/lib/services/audit.service';
import { importXml } from '@/lib/services/storage.service';

export async function createTermAction(projectId: string, data: { stringName: string; remarks?: string; values?: Record<string, string> }) {
    const session = await auth();
    if (!session?.user?.id) throw new Error("Unauthorized");

    try {
        const term = await createTerm(projectId, data, session.user.id);
        revalidatePath(`/projects/${projectId}`);
        return { success: true, term };
    } catch (error: any) {
        return { success: false, error: error.message || "Failed to create term" };
    }
}

export async function updateTermAction(projectId: string, keyId: string, data: { stringName?: string; remarks?: string | null; values?: Record<string, string> }) {
    const session = await auth();
    if (!session?.user?.id) throw new Error("Unauthorized");

    try {
        const term = await updateTerm(keyId, data, session.user.id);
        revalidatePath(`/projects/${projectId}`);
        return { success: true, term };
    } catch (error: any) {
        return { success: false, error: error.message || "Failed to update term" };
    }
}

export async function deleteTermAction(projectId: string, keyId: string) {
    const session = await auth();
    if (!session?.user?.id) throw new Error("Unauthorized");

    try {
        await deleteTerm(keyId);
        revalidatePath(`/projects/${projectId}`);
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message || "Failed to delete term" };
    }
}

export async function batchTranslateAction(projectId: string, targetLanguages?: string[]) {
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
    } catch (error: any) {
        return { success: false, error: error.message || "Batch translation failed" };
    }
}

export async function importXmlAction(projectId: string, formData: FormData) {
    const session = await auth();
    if (!session?.user?.id) throw new Error("Unauthorized");

    try {
        const project = await getProject(projectId);
        if (!project) throw new Error("Not found");

        const file = formData.get('file') as File;
        if (!file) throw new Error("No file uploaded");

        const xmlContent = await file.text();
        const result = await importXml(projectId, xmlContent, project.baseLanguage || 'en-US', session.user.id);

        await logAudit({ action: 'IMPORT_XML', userId: session.user.id, projectId, projectName: project.name, details: result });

        revalidatePath(`/projects/${projectId}`);
        return { success: true, ...result };
    } catch (error: any) {
        return { success: false, error: error.message || "Import failed" };
    }
}
