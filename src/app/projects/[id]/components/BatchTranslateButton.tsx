'use client';

import { useState, useTransition } from 'react';
import { Button } from "@/components/ui/button";
import { Wand2, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { batchTranslateAction } from '@/lib/actions/term.actions';

interface BatchTranslateButtonProps {
    projectId: string;
    targetLanguages: string[];
    baseLanguageDisplay: string;
}

export function BatchTranslateButton({ projectId, targetLanguages, baseLanguageDisplay }: BatchTranslateButtonProps) {
    const [open, setOpen] = useState(false);
    const [step, setStep] = useState<'confirm' | 'translating' | 'done'>('confirm');
    const [result, setResult] = useState<Record<string, { success: number; failed: number }> | null>(null);
    const [isPending, startTransition] = useTransition();

    const handleStart = () => {
        if (!targetLanguages || targetLanguages.length === 0) {
            toast.error("No target languages configured. Please configure them in project settings first.");
            return;
        }
        setResult(null);
        setStep('confirm');
        setOpen(true);
    };

    const confirmTranslate = () => {
        setStep('translating');
        startTransition(async () => {
            const res = await batchTranslateAction(projectId, targetLanguages, 'batch');
            if (res.success) {
                const translated = (res as Record<string, unknown>).translated as Record<string, { success: number; failed: number }> | undefined;
                if (translated) {
                    setResult(translated);
                }
                const hasFailures = translated ? Object.values(translated).some(item => item.failed > 0) : false;
                if (hasFailures) {
                    toast.warning("Batch translation partially completed. Check Error Log for failed items.");
                } else {
                    toast.success("Batch translation completed!");
                }
            } else {
                toast.error(res.error || 'Batch translation failed');
            }
            setStep('done');
        });
    };

    return (
        <>
            <Button
                onClick={handleStart}
                className="bg-zinc-100 hover:bg-white text-zinc-900"
                disabled={isPending}
            >
                {isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin text-emerald-400" /> : <Wand2 className="w-4 h-4 mr-2 text-emerald-400" />}
                Batch Translate
            </Button>

            <Dialog open={open} onOpenChange={(val) => { if (!isPending) setOpen(val); }}>
                <DialogContent showCloseButton={!isPending} className="bg-zinc-900 border-zinc-800 text-white">
                    <DialogHeader>
                        <DialogTitle>Batch Translation</DialogTitle>
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
                            <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-2">
                                <p className="text-sm font-medium text-white mb-2 sticky top-0 bg-zinc-900 pb-1">Results:</p>
                                {Object.entries(result).map(([lang, summary]) => (
                                    <div key={lang} className="flex justify-between text-sm border-b border-zinc-800 pb-1 last:border-0">
                                        <span className="text-zinc-300">{lang}</span>
                                        <div className="flex gap-4">
                                            <span className="text-emerald-400">+{summary.success} success</span>
                                            <span className={summary.failed > 0 ? "text-amber-400" : "text-zinc-500"}>{summary.failed} failed</span>
                                        </div>
                                    </div>
                                ))}
                                {Object.keys(result).length === 0 && (
                                    <p className="text-sm text-zinc-500 italic">No missing translations found.</p>
                                )}
                                {Object.values(result).some(item => item.failed > 0) && (
                                    <p className="text-xs text-amber-400 pt-2">Some items failed. See Error Log for details.</p>
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
                            <Button onClick={() => setOpen(false)} variant="secondary">
                                Close
                            </Button>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
