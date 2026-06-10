'use client';

import { useState } from 'react';
import { Columns3 } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { getLanguageDisplayName } from '@/lib/language-utils';

interface LanguageColumnSelectorProps {
    targetLanguages: string[];
    visibleTargetLanguages: string[];
}

export function LanguageColumnSelector({
    targetLanguages,
    visibleTargetLanguages,
}: LanguageColumnSelectorProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [open, setOpen] = useState(false);
    const [draftLanguages, setDraftLanguages] = useState<string[]>(visibleTargetLanguages);

    const allSelected = visibleTargetLanguages.length === targetLanguages.length;
    const visibleLabel = allSelected
        ? `All languages (${targetLanguages.length})`
        : visibleTargetLanguages.length === 0
            ? 'Base only'
        : `${visibleTargetLanguages.length} of ${targetLanguages.length} languages`;

    const handleOpenChange = (nextOpen: boolean) => {
        setOpen(nextOpen);
        if (nextOpen) {
            setDraftLanguages(visibleTargetLanguages);
        }
    };

    const toggleLanguage = (code: string) => {
        setDraftLanguages((current) =>
            current.includes(code)
                ? current.filter((item) => item !== code)
                : [...current, code]
        );
    };

    const applySelection = (nextLanguages = draftLanguages) => {
        const params = new URLSearchParams(searchParams);
        const orderedLanguages = targetLanguages.filter((code) => nextLanguages.includes(code));

        if (orderedLanguages.length === targetLanguages.length) {
            params.delete('langs');
        } else {
            params.set('langs', orderedLanguages.join(','));
        }

        params.set('page', '1');
        router.push(`?${params.toString()}`);
        setOpen(false);
    };

    if (targetLanguages.length === 0) return null;

    return (
        <>
            <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(true)}
                className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white"
            >
                <Columns3 className="mr-2 h-4 w-4" />
                {visibleLabel}
            </Button>

            <Dialog open={open} onOpenChange={handleOpenChange}>
                <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Displayed Languages</DialogTitle>
                        <DialogDescription className="text-zinc-400">
                            Limit visible language columns to reduce table render and search cost on large projects. Export and Pull API remain unchanged.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="max-h-[55vh] overflow-auto rounded-md border border-zinc-800">
                        {targetLanguages.map((code) => (
                            <label
                                key={code}
                                className="flex cursor-pointer items-center gap-3 border-b border-zinc-800 px-4 py-3 last:border-0 hover:bg-zinc-800/60"
                            >
                                <Checkbox
                                    checked={draftLanguages.includes(code)}
                                    onCheckedChange={() => toggleLanguage(code)}
                                />
                                <span className="text-sm text-zinc-200">{getLanguageDisplayName(code)}</span>
                            </label>
                        ))}
                    </div>

                    <div className="flex justify-between gap-2">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => setDraftLanguages(targetLanguages)}
                            className="text-zinc-400 hover:text-white"
                        >
                            Select All
                        </Button>
                        <div className="flex gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => applySelection([])}
                                className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white"
                            >
                                Base Only
                            </Button>
                            <Button
                                type="button"
                                onClick={() => applySelection()}
                                className="bg-zinc-100 text-zinc-900 hover:bg-white"
                            >
                                Apply
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
