'use server';

import { auth } from '@/auth';
import { revalidatePath } from 'next/cache';
import { createProject, updateProject, deleteProject } from '@/lib/services/project.service';
import { logAudit } from '@/lib/services/audit.service';
import { createProjectSchema, updateProjectSchema } from '@/lib/validators/project.schema';
import { AppError, toActionError, toValidationActionError } from '@/lib/api/errors';
import type { ProjectFormData } from '@/types';

type ProjectActionInput = Partial<ProjectFormData> & Pick<ProjectFormData, 'name'>;

export async function createProjectAction(data: ProjectActionInput) {
    const session = await auth();
    if (!session?.user?.id) return { success: false, ...toActionError(new AppError('UNAUTHORIZED'), 'UNAUTHORIZED') };

    try {
        const result = createProjectSchema.safeParse(data);
        if (!result.success) {
            return { success: false, ...toValidationActionError(result.error.issues) };
        }

        const project = await createProject(result.data);
        await logAudit({ action: 'CREATE_PROJECT', userId: session.user.id, projectId: project.id, projectName: project.name });
        revalidatePath('/projects');
        revalidatePath('/');
        return { success: true, project };
    } catch (error: unknown) {
        return { success: false, ...toActionError(error, 'PROJECT_CREATE_FAILED') };
    }
}

export async function updateProjectAction(id: string, data: Partial<ProjectFormData>) {
    const session = await auth();
    if (!session?.user?.id) return { success: false, ...toActionError(new AppError('UNAUTHORIZED'), 'UNAUTHORIZED') };

    try {
        const result = updateProjectSchema.safeParse(data);
        if (!result.success) {
            return { success: false, ...toValidationActionError(result.error.issues) };
        }

        const project = await updateProject(id, result.data);
        await logAudit({ action: 'UPDATE_PROJECT', userId: session.user.id, projectId: project.id, projectName: project.name });
        revalidatePath(`/projects/${id}`);
        revalidatePath(`/projects/${id}/settings`);
        revalidatePath('/projects');
        return { success: true, project };
    } catch (error: unknown) {
        return { success: false, ...toActionError(error, 'PROJECT_UPDATE_FAILED') };
    }
}

export async function deleteProjectAction(id: string) {
    const session = await auth();
    if (!session?.user?.id) return { success: false, ...toActionError(new AppError('UNAUTHORIZED'), 'UNAUTHORIZED') };

    try {
        await deleteProject(id);
        await logAudit({ action: 'DELETE_PROJECT', userId: session.user.id, projectId: id, projectName: 'Deleted Project' });
        revalidatePath('/projects');
        revalidatePath('/');
        return { success: true };
    } catch (error: unknown) {
        return { success: false, ...toActionError(error, 'PROJECT_DELETE_FAILED') };
    }
}
