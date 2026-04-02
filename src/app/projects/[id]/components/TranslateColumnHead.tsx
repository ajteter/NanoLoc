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
    baseLanguageDisplay: string;
}

export function TranslateColumnHead({ projectId, lang, displayStr, baseLanguageDisplay }: TranslateColumnHeadProps) {
    const [open, setOpen] = useState(false);
    const [step, setStep] = useState<'confirm' | 'translating' | 'done'>('confirm');
    const [result, setResult] = useState<Record<string, { success: number; failed: number }> | null>(null);
    const [isPending, startTransition] = useTransition();

    const handleStart = () => {
        setResult(null);
        setStep('confirm');
        setOpen(true);
    };

    const confirmTranslate = () => {
        setStep('translating');
        startTransition(async () => {
            const res = await batchTranslateAction(projectId, [lang], 'column');
            if (res.success) {
                const translated = (res as Record<string, unknown>).translated as Record<string, { success: number; failed: number }> | undefined;
                if (translated) {
                    setResult(translated);
                }
                const summary = translated?.[lang];
                if (summary && summary.failed > 0) {
                    toast.warning(`Translation partially completed for ${displayStr}. Check Error Log.`);
                } else {
                    toast.success(`Translation completed for ${displayStr}!`);
                }
            } else {
                toast.error(res.error || 'Translation failed');
            }
            setStep('done');
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
                <DialogContent showCloseButton={false} className="bg-zinc-900 border-zinc-800 text-white">
                    <DialogHeader>
                        <DialogTitle>Translating {displayStr}</DialogTitle>
                        <DialogDescription className="text-zinc-400">
                            {step === 'confirm' ? 'Confirm translation' : isPending ? '⚠️ Please do not close the browser. Translating missing items... This may take a while.' : 'Translation Complete!'}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="py-4">
                        {step === 'confirm' && (
                            <div className="flex flex-col py-2">
                                <p className="text-emerald-400 font-medium mb-2">
                                    请检查 {baseLanguageDisplay} 的文案内容是否正确
                                </p>
                                <p className="text-sm text-zinc-400">
                                    Please review the {baseLanguageDisplay} text content before translating to ensure accuracy.
                                </p>
                            </div>
                        )}

                        {isPending && (
                            <div className="flex flex-col items-center justify-center py-8">
                                <Loader2 className="h-8 w-8 animate-spin text-emerald-400 mb-4" />
                                <p className="text-sm text-zinc-400">Processing...</p>
                            </div>
                        )}

                        {step === 'done' && result && (
                            <div className="space-y-2">
                                <p className="text-sm font-medium text-white mb-2">Results:</p>
                                <div className="flex justify-between text-sm">
                                    <span className="text-zinc-300">{lang}</span>
                                    <div className="flex gap-4">
                                        <span className="text-emerald-400">+{result[lang]?.success || 0} success</span>
                                        <span className={(result[lang]?.failed || 0) > 0 ? "text-amber-400" : "text-zinc-500"}>{result[lang]?.failed || 0} failed</span>
                                    </div>
                                </div>
                                {Object.keys(result).length === 0 && (
                                    <p className="text-sm text-zinc-500 italic">No missing translations found.</p>
                                )}
                                {(result[lang]?.failed || 0) > 0 && (
                                    <p className="text-xs text-amber-400">Some items failed. See Error Log for details.</p>
                                )}
                            </div>
                        )}
                    </div>

                    <DialogFooter>
                        {step === 'confirm' && (
                            <div className="flex justify-end gap-2 w-full">
                                <Button variant="ghost" onClick={() => setOpen(false)} className="text-zinc-400">Cancel</Button>
                                <Button className="bg-emerald-600 hover:bg-emerald-500 text-white" onClick={confirmTranslate}>Confirm Translate</Button>
                            </div>
                        )}
                        {step === 'done' && (
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
