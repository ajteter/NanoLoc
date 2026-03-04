import { prisma } from '@/lib/prisma';

export type AuditAction =
    | 'CREATE_PROJECT'
    | 'UPDATE_PROJECT'
    | 'DELETE_PROJECT'
    | 'CREATE_TERM'
    | 'UPDATE_TERM'
    | 'DELETE_TERM'
    | 'UPDATE_TRANSLATION'
    | 'IMPORT_XML'
    | 'BATCH_TRANSLATE';

/**
 * Log an auditable action. Fire-and-forget — errors are caught silently.
 */
export async function logAudit(params: {
    action: AuditAction;
    userId?: string;
    projectId?: string;
    projectName?: string;
    keyName?: string;
    details?: Record<string, unknown>;
}) {
    try {
        await prisma.auditLog.create({
            data: {
                action: params.action,
                userId: params.userId || null,
                projectId: params.projectId || null,
                projectName: params.projectName || null,
                keyName: params.keyName || null,
                details: params.details ? JSON.stringify(params.details) : null,
            },
        });
    } catch (err) {
        console.error('Audit log write failed:', err);
    }
}

/**
 * Query audit logs with pagination.
 */
export async function listAuditLogs(options: { page: number; limit: number }) {
    const { page, limit } = options;

    const [total, logs] = await prisma.$transaction([
        prisma.auditLog.count(),
        prisma.auditLog.findMany({
            orderBy: { createdAt: 'desc' },
            skip: (page - 1) * limit,
            take: limit,
            include: {
                user: { select: { name: true, username: true } },
            },
        }),
    ]);

    return {
        data: logs,
        meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
}
