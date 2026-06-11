'use client';

import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useI18n } from '@/lib/i18n/client';

interface SearchResultsExportButtonProps {
    projectId: string;
    search: string;
    resultCount: number;
}

export function SearchResultsExportButton({
    projectId,
    search,
    resultCount,
}: SearchResultsExportButtonProps) {
    const { t } = useI18n();
    const normalizedSearch = search.trim();
    const disabled = !normalizedSearch || resultCount === 0;
    const disabledReason = normalizedSearch
        ? t('search.exportDisabledNoResults')
        : t('search.exportDisabledNoQuery');
    const tooltip = disabled ? disabledReason : t('search.exportResultsTooltip');
    const href = `/api/projects/${projectId}/export?${new URLSearchParams({ search: normalizedSearch }).toString()}`;

    const buttonClassName = 'w-full sm:w-auto border-zinc-700 bg-zinc-900 text-zinc-200 hover:bg-zinc-800 hover:text-white';

    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <span className="inline-flex w-full sm:w-auto">
                        {disabled ? (
                            <Button
                                type="button"
                                variant="outline"
                                disabled
                                className={buttonClassName}
                                aria-label={disabledReason}
                            >
                                <Download className="h-4 w-4" />
                                {t('search.exportResults')}
                            </Button>
                        ) : (
                            <Button
                                variant="outline"
                                asChild
                                className={buttonClassName}
                                aria-label={t('search.exportResults')}
                            >
                                <a href={href} target="_blank" rel="noopener noreferrer">
                                    <Download className="h-4 w-4" />
                                    {t('search.exportResults')}
                                </a>
                            </Button>
                        )}
                    </span>
                </TooltipTrigger>
                <TooltipContent>
                    <p>{tooltip}</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}
