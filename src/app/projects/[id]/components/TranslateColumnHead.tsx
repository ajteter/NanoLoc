'use client';

import { useState, useTransition } from 'react';
import { TableHead } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Wand2, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { batchTranslateAction } from '@/lib/actions/term.actions';

interface TranslateColumnHeadProps {
    projectId: string;
    lang: string;
    displayStr: string;
}

export function TranslateColumnHead({ projectId, lang, displayStr }: TranslateColumnHeadProps) {
    const [open, setOpen] = useState(false);
    const [result, setResult] = useState<Record<string, number> | null>(null);
    const [isPending, startTransition] = useTransition();

    const handleStart = () => {
        setResult(null);
        setOpen(true);
        startTransition(async () => {
            const res = await batchTranslateAction(projectId, [lang]);
            if (res.success) {
                const translated = (res as Record<string, unknown>).translated as Record<string, number> | undefined;
                if (translated) {
                    setResult(translated);
                }
                toast.success(`Translation completed for ${displayStr}!`);
            } else {
                toast.error(res.error || 'Translation failed');
                setOpen(false);
            }
        });
    };

    return (
        <TableHead className="text-zinc-300 w-64 min-w-[16rem]">
            <div className="flex items-center gap-2">
                <span className="truncate" title={displayStr}>
                    {displayStr}
                </span>
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleStart}
                    disabled={isPending}
                    className="h-6 w-6 text-zinc-400 hover:text-emerald-400 opacity-50 hover:opacity-100 transition-opacity"
                    title={`Translate missing ${displayStr}`}
                >
                    <Wand2 className="h-3 w-3 text-emerald-400" />
                </Button>
            </div>

            <Dialog open={open} onOpenChange={(val) => { if (!isPending) setOpen(val); }}>
                <DialogContent className="bg-zinc-900 border-zinc-800 text-white">
                    <DialogHeader>
                        <DialogTitle>Translating {displayStr}</DialogTitle>
                        <DialogDescription className="text-zinc-400">
                            {isPending ? 'Translating missing items... This may take a while.' : 'Translation Complete!'}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="py-4">
                        {isPending && (
                            <div className="flex flex-col items-center justify-center py-8">
                                <Loader2 className="h-8 w-8 animate-spin text-emerald-400 mb-4" />
                                <p className="text-sm text-zinc-400">Processing...</p>
                            </div>
                        )}

                        {result && (
                            <div className="space-y-2">
                                <p className="text-sm font-medium text-white mb-2">Results:</p>
                                <div className="flex justify-between text-sm">
                                    <span className="text-zinc-300">{lang}</span>
                                    <span className="text-emerald-400">+{result[lang] || 0} items</span>
                                </div>
                                {Object.keys(result).length === 0 && (
                                    <p className="text-sm text-zinc-500 italic">No missing translations found.</p>
                                )}
                            </div>
                        )}
                    </div>

                    <DialogFooter>
                        {!isPending && (
                            <Button onClick={() => setOpen(false)} variant="secondary" className="bg-zinc-800 text-white hover:bg-zinc-700">
                                Close
                            </Button>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </TableHead>
    );
}
