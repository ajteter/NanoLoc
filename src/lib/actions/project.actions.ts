'use server';

import { auth } from '@/auth';
import { revalidatePath } from 'next/cache';
import { createProject, updateProject, deleteProject } from '@/lib/services/project.service';
import { logAudit } from '@/lib/services/audit.service';

export async function createProjectAction(data: { name: string; description?: string; baseLanguage?: string; targetLanguages?: string[]; aiBaseUrl?: string; aiApiKey?: string; aiModelId?: string; systemPrompt?: string; }) {
    const session = await auth();
    if (!session?.user?.id) throw new Error("Unauthorized");

    try {
        const project = await createProject(data);
        await logAudit({ action: 'CREATE_PROJECT', userId: session.user.id, projectId: project.id, projectName: project.name });
        revalidatePath('/projects');
        revalidatePath('/');
        return { success: true, project };
    } catch (error: any) {
        return { success: false, error: error.message || "Failed to create project" };
    }
}

export async function updateProjectAction(id: string, data: any) {
    const session = await auth();
    if (!session?.user?.id) throw new Error("Unauthorized");

    try {
        const project = await updateProject(id, data);
        await logAudit({ action: 'UPDATE_PROJECT', userId: session.user.id, projectId: project.id, projectName: project.name });
        revalidatePath(`/projects/${id}`);
        revalidatePath(`/projects/${id}/settings`);
        revalidatePath('/projects');
        return { success: true, project };
    } catch (error: any) {
        return { success: false, error: error.message || "Failed to update project" };
    }
}

export async function deleteProjectAction(id: string) {
    const session = await auth();
    if (!session?.user?.id) throw new Error("Unauthorized");

    try {
        await deleteProject(id);
        await logAudit({ action: 'DELETE_PROJECT', userId: session.user.id, projectId: id, projectName: 'Deleted Project' });
        revalidatePath('/projects');
        revalidatePath('/');
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message || "Failed to delete project" };
    }
}
