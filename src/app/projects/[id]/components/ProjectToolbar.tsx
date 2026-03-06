'use client';

import { useRef, useTransition } from 'react';
import { Button } from "@/components/ui/button";
import { Upload, Plus } from "lucide-react";
import { toast } from "sonner";
import { importFileAction } from '@/lib/actions/term.actions';
import { BatchTranslateButton } from './BatchTranslateButton';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface ProjectToolbarProps {
    projectId: string;
    targetLanguages: string[];
}

export function ProjectToolbar({ projectId, targetLanguages }: ProjectToolbarProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isPending, startTransition] = useTransition();
    const router = useRouter();
    const searchParams = useSearchParams();

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const formData = new FormData();
            formData.append('file', file);

            startTransition(async () => {
                const toastId = toast.loading('Importing...');
                const res = await importFileAction(projectId, formData);

                if (res.success) {
                    const data = res as any;
                    toast.success(`Imported! Added: ${data.added}, Updated: ${data.updated}, Skipped: ${data.skipped}`, { id: toastId });
                } else {
                    toast.error(`Import failed: ${res.error}`, { id: toastId });
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
                accept=".xml,.json"
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
                            {isPending ? 'Importing...' : 'Import'}
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>.xml (Android) / .json (H5)</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
            <Button
                variant="secondary"
                asChild
            >
                <Link href={`/api/projects/${projectId}/export`} target="_blank">
                    <Upload className="h-4 w-4 mr-2 rotate-180" />
                    Export CSV
                </Link>
            </Button>

            <BatchTranslateButton projectId={projectId} targetLanguages={targetLanguages} />

            <Button
                onClick={handleNewTerm}
                className="bg-zinc-100 hover:bg-white text-zinc-900"
            >
                <Plus className="h-4 w-4 mr-2" />
                New Term
            </Button>
        </div>
    );
}
