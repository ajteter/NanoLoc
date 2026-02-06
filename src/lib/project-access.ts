import { prisma } from '@/lib/prisma';
import type { Session } from 'next-auth';

/**
 * public: 所有人可见，所有人可修改
 * private: 所有人可见，仅 owner 可修改
 * ownerId 为 null 的旧项目视为 public（所有人可修改）
 */
export function canEditProject(
    project: { ownerId: string | null; visibility: string },
    currentUserId: string | null
): boolean {
    if (!currentUserId) return false;
    if (project.visibility === 'public') return true;
    if (!project.ownerId) return true; // 兼容旧数据
    return project.ownerId === currentUserId;
}

export function isProjectOwner(
    project: { ownerId: string | null },
    currentUserId: string | null
): boolean {
    if (!currentUserId || !project.ownerId) return false;
    return project.ownerId === currentUserId;
}

export async function getSessionUserId(session: Session | null): Promise<string | null> {
    if (!session?.user?.email) return null;
    const user = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { id: true },
    });
    return user?.id ?? null;
}
