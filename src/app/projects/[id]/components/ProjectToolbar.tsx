'use client';

import { useState, useTransition } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { importMetadataSchema } from '@/lib/validators/term.schema';
import { Button } from "@/components/ui/button";
import { Upload, Plus } from "lucide-react";
import { toast } from "sonner";
import { importFileAction } from '@/lib/actions/term.actions';
import { BatchTranslateButton } from './BatchTranslateButton';
import { DuplicateContentButton } from './DuplicateContentButton';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useI18n } from '@/lib/i18n/client';
import { getLocalizedApiError } from '@/lib/api/errors';

interface ProjectToolbarProps {
    projectId: string;
    baseLanguage: string;
    targetLanguages: string[];
    baseLanguageDisplay: string;
}

export function ProjectToolbar({ projectId, baseLanguage, targetLanguages, baseLanguageDisplay }: ProjectToolbarProps) {
    const [importOpen, setImportOpen] = useState(false);
    const [file, setFile] = useState<File | null>(null);
    const [developerOwner, setDeveloperOwner] = useState('');
    const [requestNote, setRequestNote] = useState('');
    const [isPending, startTransition] = useTransition();
    const router = useRouter();
    const searchParams = useSearchParams();
    const { t } = useI18n();

    const handleFileUpload = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!file) return;
        const metadata = importMetadataSchema.safeParse({ developerOwner, requestNote });
        if (!metadata.success) {
            toast.error(t('term.ownerRequired'));
            return;
        }
        const formData = new FormData();
        formData.append('file', file);
        formData.append('developerOwner', metadata.data.developerOwner);
        formData.append('requestNote', metadata.data.requestNote || '');

        startTransition(async () => {
            const toastId = toast.loading(t('projectToolbar.importing'));
            const res = await importFileAction(projectId, formData);
            if (res.success) {
                toast.success(`${t('projectToolbar.imported')} ${t('projectToolbar.added')}: ${res.added}, ${t('projectToolbar.updated')}: ${res.updated}, ${t('projectToolbar.skipped')}: ${res.skipped}`, { id: toastId });
                setImportOpen(false);
                setFile(null);
            } else {
                toast.error(`${t('projectToolbar.importFailed')}: ${getLocalizedApiError(res, t, t('projectToolbar.importFailed'))}`, { id: toastId });
            }
        });
    };

    const handleNewTerm = () => {
        const params = new URLSearchParams(searchParams);
        params.set('create', 'true');
        router.push(`?${params.toString()}`);
    };

    return (
        <div className="flex flex-wrap gap-3 items-center">
            <Dialog open={importOpen} onOpenChange={(open) => { if (!isPending) setImportOpen(open); }}>
                <DialogContent closeLabel={t('common.close')} className="bg-zinc-900 border-zinc-700 text-white">
                    <DialogHeader>
                        <DialogTitle>{t('import.title')}</DialogTitle>
                        <DialogDescription>{t('import.description')}</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleFileUpload} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="import-file">{t('import.file')}</Label>
                            <Input id="import-file" type="file" accept=".xml,.json,.strings" required disabled={isPending}
                                onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="import-owner">{t('term.developerOwner')}</Label>
                            <Input id="import-owner" value={developerOwner} required disabled={isPending}
                                onChange={(event) => setDeveloperOwner(event.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="import-request">{t('term.requestNote')}</Label>
                            <Input id="import-request" value={requestNote} disabled={isPending}
                                onChange={(event) => setRequestNote(event.target.value)} />
                        </div>
                        <div className="flex justify-end gap-2">
                            <Button type="button" variant="ghost" disabled={isPending} onClick={() => setImportOpen(false)}>{t('common.cancel')}</Button>
                            <Button type="submit" disabled={isPending || !file || !developerOwner.trim()}>
                                {isPending ? t('projectToolbar.importing') : t('projectToolbar.import')}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant="secondary"
                            onClick={() => { setFile(null); setImportOpen(true); }}
                            disabled={isPending}
                        >
                            <Upload className="h-4 w-4 mr-2" />
                            {isPending ? t('projectToolbar.importing') : t('projectToolbar.import')}
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>{t('projectToolbar.importTooltip')}</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
            <Button
                variant="secondary"
                asChild
            >
                <Link href={`/api/projects/${projectId}/export`} target="_blank">
                    <Upload className="h-4 w-4 mr-2 rotate-180" />
                    {t('projectToolbar.exportCsv')}
                </Link>
            </Button>

            <BatchTranslateButton projectId={projectId} targetLanguages={targetLanguages} baseLanguageDisplay={baseLanguageDisplay} />

            <DuplicateContentButton projectId={projectId} languageCodes={[baseLanguage, ...targetLanguages]} />

            <Button
                onClick={handleNewTerm}
                className="bg-zinc-100 hover:bg-white text-zinc-900"
            >
                <Plus className="h-4 w-4 mr-2" />
                {t('projectToolbar.newTerm')}
            </Button>
        </div>
    );
}
