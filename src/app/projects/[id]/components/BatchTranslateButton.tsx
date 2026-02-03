'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Wand2, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

interface BatchTranslateButtonProps {
    projectId: string;
    targetLanguages: string[];
}

export function BatchTranslateButton({ projectId, targetLanguages }: BatchTranslateButtonProps) {
    const queryClient = useQueryClient();
    const [open, setOpen] = useState(false);
    const [result, setResult] = useState<Record<string, number> | null>(null);

    const mutation = useMutation({
        mutationFn: async () => {
            const res = await fetch(`/api/projects/${projectId}/batch-translate`, {
                method: 'POST',
            });
            if (!res.ok) {
                const json = await res.json();
                throw new Error(JSON.stringify(json.error) || 'Batch translation failed');
            }
            return res.json();
        },
        onSuccess: (data) => {
            setResult(data.translated);
            queryClient.invalidateQueries({ queryKey: ['terms', projectId] });
            toast.success("Batch translation completed!");
        },
        onError: (err) => {
            toast.error('Error: ' + err.message);
            setOpen(false);
        }
    });

    const handleStart = () => {
        if (!targetLanguages || targetLanguages.length === 0) {
            toast.error("No target languages configured. Please configure them in project settings first.");
            return;
        }
        setResult(null);
        setOpen(true);
        mutation.mutate();
    };

    return (
        <>
            <Button
                onClick={handleStart}
                className="bg-purple-600 hover:bg-purple-500 text-white"
                disabled={mutation.isPending}
            >
                {mutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Wand2 className="w-4 h-4 mr-2" />}
                Batch Translate
            </Button>

            <Dialog open={open} onOpenChange={(val) => { if (!mutation.isPending) setOpen(val); }}>
                <DialogContent className="bg-gray-900 border-gray-800 text-white">
                    <DialogHeader>
                        <DialogTitle>Batch Translation</DialogTitle>
                        <DialogDescription className="text-gray-400">
                            {mutation.isPending ? 'Translating missing items... This may take a while.' : 'Translation Complete!'}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="py-4">
                        {mutation.isPending && (
                            <div className="flex flex-col items-center justify-center py-8">
                                <Loader2 className="h-8 w-8 animate-spin text-purple-500 mb-4" />
                                <p className="text-sm text-gray-400">Processing...</p>
                            </div>
                        )}

                        {result && (
                            <div className="space-y-2">
                                <p className="text-sm font-medium text-white mb-2">Results:</p>
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
                        {!mutation.isPending && (
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
