'use server';

import { auth } from '@/auth';
import { revalidatePath } from 'next/cache';
import { createProject, updateProject, deleteProject } from '@/lib/services/project.service';
import { logAudit } from '@/lib/services/audit.service';
import type { ProjectFormData } from '@/types';

type ProjectActionInput = Partial<ProjectFormData> & Pick<ProjectFormData, 'name'>;

function getErrorMessage(error: unknown, fallback: string) {
    return error instanceof Error ? error.message : fallback;
}

export async function createProjectAction(data: ProjectActionInput) {
    const session = await auth();
    if (!session?.user?.id) throw new Error("Unauthorized");

    try {
        const project = await createProject(data);
        await logAudit({ action: 'CREATE_PROJECT', userId: session.user.id, projectId: project.id, projectName: project.name });
        revalidatePath('/projects');
        revalidatePath('/');
        return { success: true, project };
    } catch (error: unknown) {
        return { success: false, error: getErrorMessage(error, "Failed to create project") };
    }
}

export async function updateProjectAction(id: string, data: Partial<ProjectFormData>) {
    const session = await auth();
    if (!session?.user?.id) throw new Error("Unauthorized");

    try {
        const project = await updateProject(id, data);
        await logAudit({ action: 'UPDATE_PROJECT', userId: session.user.id, projectId: project.id, projectName: project.name });
        revalidatePath(`/projects/${id}`);
        revalidatePath(`/projects/${id}/settings`);
        revalidatePath('/projects');
        return { success: true, project };
    } catch (error: unknown) {
        return { success: false, error: getErrorMessage(error, "Failed to update project") };
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
    } catch (error: unknown) {
        return { success: false, error: getErrorMessage(error, "Failed to delete project") };
    }
}
