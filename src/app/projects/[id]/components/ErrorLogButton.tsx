'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface ErrorLogItem {
    id: string;
    keyName: string | null;
    languageCode: string;
    errorCode: string;
    errorMessage: string;
    source: string;
    details: string | null;
    createdAt: string;
}

interface ErrorLogButtonProps {
    projectId: string;
}

export function ErrorLogButton({ projectId }: ErrorLogButtonProps) {
    const [open, setOpen] = useState(false);

    const { data, isLoading, error, refetch, isFetching } = useQuery<{ errors: ErrorLogItem[] }>({
        queryKey: ['project-error-log', projectId],
        queryFn: async () => {
            const res = await fetch(`/api/projects/${projectId}/errors`);
            if (!res.ok) {
                throw new Error('Failed to load error log');
            }
            return res.json();
        },
        enabled: open,
        staleTime: 15000,
    });

    const items = data?.errors || [];

    return (
        <>
            <Button
                variant="outline"
                size="sm"
                className="text-amber-300 border-amber-700/60 hover:bg-amber-950/40 hover:text-amber-200 gap-2"
                onClick={() => {
                    setOpen(true);
                    if (!open) {
                        void refetch();
                    }
                }}
            >
                <AlertTriangle className="h-4 w-4" />
                Error Log
            </Button>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-5xl">
                    <DialogHeader>
                        <DialogTitle>Error Log</DialogTitle>
                        <DialogDescription className="text-zinc-400">
                            Translation failures recorded for this project. Each record includes the key, language, error code, and error details.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="max-h-[70vh] overflow-auto rounded-md border border-zinc-800">
                        {isLoading || isFetching ? (
                            <div className="flex items-center justify-center py-16 text-zinc-400">
                                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                                Loading error log...
                            </div>
                        ) : error ? (
                            <div className="py-16 text-center text-red-400">Failed to load error log.</div>
                        ) : items.length === 0 ? (
                            <div className="py-16 text-center text-zinc-500">No translation errors recorded.</div>
                        ) : (
                            <table className="min-w-full text-sm">
                                <thead className="sticky top-0 bg-zinc-900 border-b border-zinc-800">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-400">Time</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-400">Key</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-400">Language</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-400">Source</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-400">Error Code</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-400">Description</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-800">
                                    {items.map((item) => (
                                        <tr key={item.id} className="align-top hover:bg-zinc-800/40">
                                            <td className="px-4 py-3 whitespace-nowrap text-zinc-400">
                                                {new Date(item.createdAt).toLocaleString()}
                                            </td>
                                            <td className="px-4 py-3 font-mono text-zinc-200 max-w-[220px] break-all">
                                                {item.keyName || '—'}
                                            </td>
                                            <td className="px-4 py-3 text-zinc-300 whitespace-nowrap">
                                                {item.languageCode}
                                            </td>
                                            <td className="px-4 py-3 text-zinc-400 whitespace-nowrap uppercase">
                                                {item.source}
                                            </td>
                                            <td className="px-4 py-3 text-amber-300 font-mono whitespace-nowrap">
                                                {item.errorCode}
                                            </td>
                                            <td className="px-4 py-3 text-zinc-300 whitespace-pre-wrap break-words min-w-[320px]">
                                                {item.errorMessage}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
