'use client';

import { useState } from 'react';
import { CopyCheck, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { getLanguageDisplayName } from '@/lib/language-utils';
import { useI18n } from '@/lib/i18n/client';
import { getLocalizedApiError, readApiErrorBody } from '@/lib/api/errors';

interface DuplicateTerm {
    id: string;
    stringName: string;
    remarks: string | null;
    content: string;
}

interface DuplicateGroup {
    content: string;
    normalizedContent: string;
    count: number;
    terms: DuplicateTerm[];
}

interface DuplicateResult {
    languageCode: string;
    totalDuplicateGroups: number;
    totalDuplicateTerms: number;
    groups: DuplicateGroup[];
}

interface DuplicateContentButtonProps {
    projectId: string;
    languageCodes: string[];
}

export function DuplicateContentButton({ projectId, languageCodes }: DuplicateContentButtonProps) {
    const [open, setOpen] = useState(false);
    const [languageCode, setLanguageCode] = useState(languageCodes[0] || '');
    const [ignoreCase, setIgnoreCase] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<DuplicateResult | null>(null);
    const { t } = useI18n();

    const runCheck = async () => {
        if (!languageCode) {
            toast.error(t('duplicates.noLanguage'));
            return;
        }

        setIsLoading(true);
        setResult(null);

        try {
            const params = new URLSearchParams({
                lang: languageCode,
                ignoreCase: String(ignoreCase),
            });
            const response = await fetch(`/api/projects/${projectId}/duplicates?${params.toString()}`);

            if (!response.ok) {
                const data = await readApiErrorBody(response);
                throw new Error(getLocalizedApiError(data, t, t('duplicates.failedFallback')));
            }

            const data = await response.json();
            setResult(data);
        } catch (error) {
            const message = error instanceof Error ? error.message : t('duplicates.failedFallback');
            toast.error(message);
        } finally {
            setIsLoading(false);
        }
    };

    const openDialog = () => {
        setOpen(true);
        if (!result && languageCode) {
            void runCheck();
        }
    };

    return (
        <>
            <Button
                type="button"
                variant="secondary"
                onClick={openDialog}
                disabled={languageCodes.length === 0}
            >
                <CopyCheck className="h-4 w-4 mr-2 text-amber-400" />
                {t('duplicates.button')}
            </Button>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-5xl">
                    <DialogHeader>
                        <DialogTitle>{t('duplicates.title')}</DialogTitle>
                        <DialogDescription className="text-zinc-400">
                            {t('duplicates.description')}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                        <label className="flex flex-1 flex-col gap-2 text-sm text-zinc-300">
                            {t('common.language')}
                            <select
                                value={languageCode}
                                onChange={(event) => setLanguageCode(event.target.value)}
                                className="h-10 rounded-md border border-zinc-700 bg-zinc-950 px-3 text-sm text-white"
                            >
                                {languageCodes.map((code) => (
                                    <option key={code} value={code}>
                                        {getLanguageDisplayName(code)}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <label className="flex h-10 items-center gap-2 text-sm text-zinc-300">
                            <input
                                type="checkbox"
                                checked={ignoreCase}
                                onChange={(event) => setIgnoreCase(event.target.checked)}
                                className="h-4 w-4 rounded border-zinc-700 bg-zinc-950"
                            />
                            {t('duplicates.ignoreCase')}
                        </label>
                        <Button type="button" onClick={runCheck} disabled={isLoading || !languageCode}>
                            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CopyCheck className="mr-2 h-4 w-4" />}
                            {t('duplicates.check')}
                        </Button>
                    </div>

                    <div className="max-h-[65vh] overflow-auto rounded-md border border-zinc-800">
                        {isLoading ? (
                            <div className="flex items-center justify-center py-16 text-zinc-400">
                                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                {t('duplicates.loading')}
                            </div>
                        ) : !result ? (
                            <div className="py-16 text-center text-zinc-500">{t('duplicates.prompt')}</div>
                        ) : result.groups.length === 0 ? (
                            <div className="py-16 text-center text-zinc-500">{t('duplicates.none')}</div>
                        ) : (
                            <div className="divide-y divide-zinc-800">
                                <div className="sticky top-0 z-10 flex items-center justify-between bg-zinc-900 px-4 py-3 text-sm text-zinc-300">
                                    <span>
                                        {result.totalDuplicateGroups} {t('duplicates.groups')}, {result.totalDuplicateTerms} {t('duplicates.terms')}
                                    </span>
                                    <span className="text-zinc-500">{getLanguageDisplayName(result.languageCode)}</span>
                                </div>
                                {result.groups.map((group) => (
                                    <div key={group.normalizedContent} className="p-4">
                                        <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                                            <p className="max-w-3xl whitespace-pre-wrap break-words text-sm font-medium text-white">
                                                {group.content}
                                            </p>
                                            <span className="rounded-full border border-amber-700/60 px-2 py-0.5 text-xs text-amber-300">
                                                {group.count} {t('duplicates.terms')}
                                            </span>
                                        </div>
                                        <div className="grid gap-2">
                                            {group.terms.map((term) => (
                                                <div key={term.id} className="rounded-md bg-zinc-950/80 px-3 py-2">
                                                    <div className="font-mono text-xs text-emerald-300">{term.stringName}</div>
                                                    {term.remarks && (
                                                        <div className="mt-1 line-clamp-2 text-xs text-zinc-500">{term.remarks}</div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
