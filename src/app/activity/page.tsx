'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ArrowLeft, FileUp, Globe, Plus, Pencil, Trash2, FolderPlus, FolderCog, FolderX, Wand2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n/client';
import type { TranslationKey } from '@/lib/i18n/dictionaries';

const ACTION_CONFIG: Record<string, { labelKey: TranslationKey; icon: React.ReactNode; color: string }> = {
    CREATE_PROJECT: { labelKey: 'activity.action.createProject', icon: <FolderPlus className="h-3.5 w-3.5" />, color: 'text-emerald-400' },
    UPDATE_PROJECT: { labelKey: 'activity.action.updateProject', icon: <FolderCog className="h-3.5 w-3.5" />, color: 'text-zinc-300' },
    DELETE_PROJECT: { labelKey: 'activity.action.deleteProject', icon: <FolderX className="h-3.5 w-3.5" />, color: 'text-red-500' },
    CREATE_TERM: { labelKey: 'activity.action.createTerm', icon: <Plus className="h-3.5 w-3.5" />, color: 'text-emerald-400' },
    UPDATE_TERM: { labelKey: 'activity.action.updateTerm', icon: <Pencil className="h-3.5 w-3.5" />, color: 'text-zinc-300' },
    DELETE_TERM: { labelKey: 'activity.action.deleteTerm', icon: <Trash2 className="h-3.5 w-3.5" />, color: 'text-red-500' },
    UPDATE_TRANSLATION: { labelKey: 'activity.action.updateTranslation', icon: <Globe className="h-3.5 w-3.5" />, color: 'text-zinc-300' },
    IMPORT_XML: { labelKey: 'activity.action.importXml', icon: <FileUp className="h-3.5 w-3.5" />, color: 'text-amber-400' },
    IMPORT_FILE: { labelKey: 'activity.action.importFile', icon: <FileUp className="h-3.5 w-3.5" />, color: 'text-amber-400' },
    BATCH_TRANSLATE: { labelKey: 'activity.action.batchTranslate', icon: <Wand2 className="h-3.5 w-3.5" />, color: 'text-emerald-400' },
};

interface AuditItem {
    id: string;
    action: string;
    projectId: string | null;
    projectName: string | null;
    keyName: string | null;
    details: string | null;
    createdAt: string;
    user: { name: string | null; username?: string } | null;
}

interface AuditResponse {
    data: AuditItem[];
    meta: { total: number; page: number; limit: number; totalPages: number };
}

export default function ActivityPage() {
    const { t, locale } = useI18n();
    const [page, setPage] = useState(1);
    const limit = 50;

    const formatMessage = (key: TranslationKey, values: Record<string, string | number>) => {
        let message = t(key);
        for (const [name, value] of Object.entries(values)) {
            message = message.replace(`{${name}}`, String(value));
        }
        return message;
    };

    const { data, isLoading, error } = useQuery<AuditResponse>({
        queryKey: ['activity', page],
        queryFn: async () => {
            const res = await fetch(`/api/activity?page=${page}&limit=${limit}`);
            if (!res.ok) throw new Error(t('activity.fetchFailed'));
            return res.json();
        },
    });

    const formatTime = (iso: string) => {
        const d = new Date(iso);
        const now = new Date();
        const diffMs = now.getTime() - d.getTime();
        const diffMin = Math.floor(diffMs / 60000);
        const diffHr = Math.floor(diffMin / 60);
        const diffDay = Math.floor(diffHr / 24);

        if (diffMin < 1) return t('activity.justNow');
        if (diffMin < 60) return formatMessage('activity.minutesAgo', { count: diffMin });
        if (diffHr < 24) return formatMessage('activity.hoursAgo', { count: diffHr });
        if (diffDay < 7) return formatMessage('activity.daysAgo', { count: diffDay });
        return d.toLocaleDateString(locale, { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
    };

    const getUserName = (item: AuditItem) => {
        if (!item.user) return t('common.system');
        return item.user.name || item.user.username || t('common.unknown');
    };

    const getDetails = (item: AuditItem) => {
        if (!item.details) return null;
        try {
            const d = JSON.parse(item.details);
            if (d.added !== undefined) return formatMessage('activity.importDetails', {
                added: d.added,
                updated: d.updated,
                skipped: d.skipped,
            });
            if (d.languages) return (d.languages as string[]).join(', ');
            return null;
        } catch {
            return null;
        }
    };

    return (
        <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-white" asChild>
                        <Link href="/projects">
                            <ArrowLeft className="h-4 w-4 mr-1" />
                            {t('common.back')}
                        </Link>
                    </Button>
                    <h1 className="text-2xl font-bold leading-7 text-white sm:text-3xl">
                        {t('activity.title')}
                    </h1>
                </div>
            </div>

            {isLoading && (
                <div className="space-y-2">
                    {[...Array(10)].map((_, i) => (
                        <div key={i} className="animate-pulse bg-zinc-800 h-12 rounded-md" />
                    ))}
                </div>
            )}

            {error && <div className="text-red-500">{t('activity.loadFailed')}</div>}

            {data && data.data.length === 0 && (
                <div className="text-center py-12 text-zinc-400">
                    {t('activity.empty')}
                </div>
            )}

            {data && data.data.length > 0 && (
                <>
                    <div className="overflow-hidden rounded-lg bg-zinc-900 border border-zinc-800">
                        <table className="min-w-full">
                            <thead className="bg-zinc-900 border-b border-zinc-800">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">{t('activity.time')}</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">{t('activity.action')}</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">{t('activity.user')}</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">{t('activity.project')}</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">{t('common.key')}</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">{t('activity.details')}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-800">
                                {data.data.map((item) => {
                                    const config = ACTION_CONFIG[item.action];
                                    const details = getDetails(item);

                                    return (
                                        <tr key={item.id} className="hover:bg-zinc-800/50 transition-colors">
                                            <td className="px-4 py-3 text-sm text-zinc-400 whitespace-nowrap">
                                                {formatTime(item.createdAt)}
                                            </td>
                                            <td className="px-4 py-3 text-sm whitespace-nowrap">
                                                <span className={cn("inline-flex items-center gap-1.5", config?.color ?? 'text-zinc-400')}>
                                                    {config?.icon}
                                                    {config ? t(config.labelKey) : item.action}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-white whitespace-nowrap">
                                                {getUserName(item)}
                                            </td>
                                            <td className="px-4 py-3 text-sm whitespace-nowrap">
                                                {item.projectId ? (
                                                    <Link
                                                        href={`/projects/${item.projectId}`}
                                                        className="text-zinc-300 hover:text-zinc-200"
                                                    >
                                                        {item.projectName || item.projectId}
                                                    </Link>
                                                ) : (
                                                    <span className="text-zinc-500">{item.projectName || '—'}</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-zinc-300 font-mono whitespace-nowrap max-w-[200px] truncate" title={item.keyName || ''}>
                                                {item.keyName || '—'}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-zinc-400 max-w-[250px] truncate" title={details || ''}>
                                                {details || '—'}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {data.meta.totalPages > 1 && (
                        <div className="flex items-center justify-between mt-4">
                            <span className="text-sm text-zinc-400">
                                {formatMessage('activity.pageSummary', {
                                    page: data.meta.page,
                                    totalPages: data.meta.totalPages,
                                    total: data.meta.total,
                                })}
                            </span>
                            <div className="flex items-center gap-1">
                                <Button variant="ghost" size="sm" onClick={() => setPage(1)} disabled={page === 1} className="text-zinc-400 hover:text-white disabled:opacity-30">
                                    <ChevronsLeft className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="text-zinc-400 hover:text-white disabled:opacity-30">
                                    <ChevronLeft className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => setPage(p => Math.min(data.meta.totalPages, p + 1))} disabled={page === data.meta.totalPages} className="text-zinc-400 hover:text-white disabled:opacity-30">
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => setPage(data.meta.totalPages)} disabled={page === data.meta.totalPages} className="text-zinc-400 hover:text-white disabled:opacity-30">
                                    <ChevronsRight className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    )}
                </>
            )}
        </main>
    );
}
