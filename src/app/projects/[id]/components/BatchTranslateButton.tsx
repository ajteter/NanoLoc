'use client';

import { useState, useTransition } from 'react';
import { Button } from "@/components/ui/button";
import { Wand2, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { batchTranslateAction } from '@/lib/actions/term.actions';
import { useI18n } from '@/lib/i18n/client';

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
    const { t } = useI18n();

    const formatLanguageText = (key: 'batch.reviewTitle' | 'batch.reviewDescription') =>
        t(key).replace('{language}', baseLanguageDisplay);

    const handleStart = () => {
        if (!targetLanguages || targetLanguages.length === 0) {
            toast.error(t('batch.noTargetLanguages'));
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
                    toast.warning(t('batch.partialToast'));
                } else {
                    toast.success(t('batch.successToast'));
                }
            } else {
                toast.error(res.error || t('batch.failedFallback'));
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
                {t('batch.button')}
            </Button>

            <Dialog open={open} onOpenChange={(val) => { if (!isPending) setOpen(val); }}>
                <DialogContent showCloseButton={!isPending} className="bg-zinc-900 border-zinc-800 text-white">
                    <DialogHeader>
                        <DialogTitle>{t('batch.title')}</DialogTitle>
                        <DialogDescription className="text-zinc-400">
                            {step === 'confirm' ? t('batch.confirmDescription') : isPending ? t('batch.runningDescription') : t('batch.doneDescription')}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="py-4">
                        {step === 'confirm' && (
                            <div className="flex flex-col py-2">
                                <p className="text-emerald-400 font-medium mb-2">
                                    {formatLanguageText('batch.reviewTitle')}
                                </p>
                                <p className="text-sm text-zinc-400">
                                    {formatLanguageText('batch.reviewDescription')}
                                </p>
                            </div>
                        )}

                        {isPending && (
                            <div className="flex flex-col items-center justify-center py-8">
                                <Loader2 className="h-8 w-8 animate-spin text-emerald-400 mb-4" />
                                <p className="text-sm text-zinc-400">{t('common.processing')}</p>
                            </div>
                        )}

                        {step === 'done' && result && (
                            <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-2">
                                <p className="text-sm font-medium text-white mb-2 sticky top-0 bg-zinc-900 pb-1">{t('common.results')}</p>
                                {Object.entries(result).map(([lang, summary]) => (
                                    <div key={lang} className="flex justify-between text-sm border-b border-zinc-800 pb-1 last:border-0">
                                        <span className="text-zinc-300">{lang}</span>
                                        <div className="flex gap-4">
                                            <span className="text-emerald-400">+{summary.success} {t('common.success')}</span>
                                            <span className={summary.failed > 0 ? "text-amber-400" : "text-zinc-500"}>{summary.failed} {t('common.failed')}</span>
                                        </div>
                                    </div>
                                ))}
                                {Object.keys(result).length === 0 && (
                                    <p className="text-sm text-zinc-500 italic">{t('batch.noMissingTranslations')}</p>
                                )}
                                {Object.values(result).some(item => item.failed > 0) && (
                                    <p className="text-xs text-amber-400 pt-2">{t('batch.failedHint')}</p>
                                )}
                            </div>
                        )}
                    </div>

                    <DialogFooter>
                        {step === 'confirm' && (
                            <div className="flex justify-end gap-2 w-full">
                                <Button variant="ghost" onClick={() => setOpen(false)} className="text-zinc-400">{t('common.cancel')}</Button>
                                <Button className="bg-emerald-600 hover:bg-emerald-500 text-white" onClick={confirmTranslate}>{t('batch.confirmButton')}</Button>
                            </div>
                        )}
                        {step === 'done' && (
                            <Button onClick={() => setOpen(false)} variant="secondary">
                                {t('common.close')}
                            </Button>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
