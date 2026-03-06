'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ArrowLeft, FileUp, Globe, Plus, Pencil, Trash2, FolderPlus, FolderCog, FolderX, Wand2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const ACTION_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
    CREATE_PROJECT: { label: '创建项目', icon: <FolderPlus className="h-3.5 w-3.5" />, color: 'text-emerald-400' },
    UPDATE_PROJECT: { label: '更新项目设置', icon: <FolderCog className="h-3.5 w-3.5" />, color: 'text-zinc-300' },
    DELETE_PROJECT: { label: '删除项目', icon: <FolderX className="h-3.5 w-3.5" />, color: 'text-red-500' },
    CREATE_TERM: { label: '新建词条', icon: <Plus className="h-3.5 w-3.5" />, color: 'text-emerald-400' },
    UPDATE_TERM: { label: '编辑词条', icon: <Pencil className="h-3.5 w-3.5" />, color: 'text-zinc-300' },
    DELETE_TERM: { label: '删除词条', icon: <Trash2 className="h-3.5 w-3.5" />, color: 'text-red-500' },
    UPDATE_TRANSLATION: { label: '更新翻译', icon: <Globe className="h-3.5 w-3.5" />, color: 'text-zinc-300' },
    IMPORT_XML: { label: '导入 XML', icon: <FileUp className="h-3.5 w-3.5" />, color: 'text-amber-400' },
    IMPORT_FILE: { label: '导入文件', icon: <FileUp className="h-3.5 w-3.5" />, color: 'text-amber-400' },
    BATCH_TRANSLATE: { label: '批量翻译', icon: <Wand2 className="h-3.5 w-3.5" />, color: 'text-emerald-400' },
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
    const [page, setPage] = useState(1);
    const limit = 50;

    const { data, isLoading, error } = useQuery<AuditResponse>({
        queryKey: ['activity', page],
        queryFn: async () => {
            const res = await fetch(`/api/activity?page=${page}&limit=${limit}`);
            if (!res.ok) throw new Error('Failed to fetch activity');
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

        if (diffMin < 1) return 'just now';
        if (diffMin < 60) return `${diffMin}m ago`;
        if (diffHr < 24) return `${diffHr}h ago`;
        if (diffDay < 7) return `${diffDay}d ago`;
        return d.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
    };

    const getUserName = (item: AuditItem) => {
        if (!item.user) return 'System';
        return item.user.name || item.user.username || 'Unknown';
    };

    const getDetails = (item: AuditItem) => {
        if (!item.details) return null;
        try {
            const d = JSON.parse(item.details);
            if (d.added !== undefined) return `+${d.added} added, ${d.updated} updated, ${d.skipped} skipped`;
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
                            Back
                        </Link>
                    </Button>
                    <h1 className="text-2xl font-bold leading-7 text-white sm:text-3xl">
                        Activity Log
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

            {error && <div className="text-red-500">Error loading activity log</div>}

            {data && data.data.length === 0 && (
                <div className="text-center py-12 text-zinc-400">
                    No activity recorded yet.
                </div>
            )}

            {data && data.data.length > 0 && (
                <>
                    <div className="overflow-hidden rounded-lg bg-zinc-900 border border-zinc-800">
                        <table className="min-w-full">
                            <thead className="bg-zinc-900 border-b border-zinc-800">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">Time</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">Action</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">User</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">Project</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">Key</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">Details</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-800">
                                {data.data.map((item) => {
                                    const config = ACTION_CONFIG[item.action] || { label: item.action, icon: null, color: 'text-zinc-400' };
                                    const details = getDetails(item);

                                    return (
                                        <tr key={item.id} className="hover:bg-zinc-800/50 transition-colors">
                                            <td className="px-4 py-3 text-sm text-zinc-400 whitespace-nowrap">
                                                {formatTime(item.createdAt)}
                                            </td>
                                            <td className="px-4 py-3 text-sm whitespace-nowrap">
                                                <span className={cn("inline-flex items-center gap-1.5", config.color)}>
                                                    {config.icon}
                                                    {config.label}
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
                                Page {data.meta.page} of {data.meta.totalPages} ({data.meta.total} records)
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
