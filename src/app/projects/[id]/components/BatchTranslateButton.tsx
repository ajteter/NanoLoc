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
}

export function BatchTranslateButton({ projectId, targetLanguages }: BatchTranslateButtonProps) {
    const [open, setOpen] = useState(false);
    const [result, setResult] = useState<Record<string, number> | null>(null);
    const [isPending, startTransition] = useTransition();

    const handleStart = () => {
        if (!targetLanguages || targetLanguages.length === 0) {
            toast.error("No target languages configured. Please configure them in project settings first.");
            return;
        }
        setResult(null);
        setOpen(true);
        startTransition(async () => {
            const res = await batchTranslateAction(projectId, targetLanguages);
            if (res.success) {
                if (res.translated) {
                    setResult(res.translated);
                }
                toast.success("Batch translation completed!");
            } else {
                toast.error(res.error || 'Batch translation failed');
                setOpen(false);
            }
        });
    };

    return (
        <>
            <Button
                onClick={handleStart}
                className="bg-purple-600 hover:bg-purple-500 text-white"
                disabled={isPending}
            >
                {isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Wand2 className="w-4 h-4 mr-2" />}
                Batch Translate
            </Button>

            <Dialog open={open} onOpenChange={(val) => { if (!isPending) setOpen(val); }}>
                <DialogContent className="bg-gray-900 border-gray-800 text-white">
                    <DialogHeader>
                        <DialogTitle>Batch Translation</DialogTitle>
                        <DialogDescription className="text-gray-400">
                            {isPending ? 'Translating missing items... This may take a while.' : 'Translation Complete!'}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="py-4">
                        {isPending && (
                            <div className="flex flex-col items-center justify-center py-8">
                                <Loader2 className="h-8 w-8 animate-spin text-purple-500 mb-4" />
                                <p className="text-sm text-gray-400">Processing...</p>
                            </div>
                        )}

                        {result && (
                            <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-2">
                                <p className="text-sm font-medium text-white mb-2 sticky top-0 bg-gray-900 pb-1">Results:</p>
                                {Object.entries(result).map(([lang, count]) => (
                                    <div key={lang} className="flex justify-between text-sm border-b border-gray-800 pb-1 last:border-0">
                                        <span className="text-gray-300">{lang}</span>
                                        <span className="text-green-400">+{count} items</span>
                                    </div>
                                ))}
                                {Object.keys(result).length === 0 && (
                                    <p className="text-sm text-gray-500 italic">No missing translations found.</p>
                                )}
                            </div>
                        )}
                    </div>

                    <DialogFooter>
                        {!isPending && (
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
