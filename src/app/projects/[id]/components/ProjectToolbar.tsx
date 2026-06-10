'use client';

import { useRef, useTransition } from 'react';
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
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isPending, startTransition] = useTransition();
    const router = useRouter();
    const searchParams = useSearchParams();
    const { t } = useI18n();

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const formData = new FormData();
            formData.append('file', file);

            startTransition(async () => {
                const toastId = toast.loading(t('projectToolbar.importing'));
                const res = await importFileAction(projectId, formData);

                if (res.success) {
                    toast.success(`${t('projectToolbar.imported')} ${t('projectToolbar.added')}: ${res.added}, ${t('projectToolbar.updated')}: ${res.updated}, ${t('projectToolbar.skipped')}: ${res.skipped}`, { id: toastId });
                } else {
                    toast.error(`${t('projectToolbar.importFailed')}: ${getLocalizedApiError(res, t, t('projectToolbar.importFailed'))}`, { id: toastId });
                }
            });
        }
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleNewTerm = () => {
        const params = new URLSearchParams(searchParams);
        params.set('create', 'true');
        router.push(`?${params.toString()}`);
    };

    return (
        <div className="flex gap-3 items-center">
            <input
                type="file"
                accept=".xml,.json,.strings"
                hidden
                ref={fileInputRef}
                onChange={handleFileUpload}
            />

            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant="secondary"
                            onClick={() => fileInputRef.current?.click()}
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
