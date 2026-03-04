'use client';

import { useRef, useTransition } from 'react';
import { Button } from "@/components/ui/button";
import { Upload, Plus } from "lucide-react";
import { toast } from "sonner";
import { importXmlAction } from '@/lib/actions/term.actions';
import { BatchTranslateButton } from './BatchTranslateButton';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

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
                const toastId = toast.loading('Importing XML...');
                const res = await importXmlAction(projectId, formData);

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
                accept=".xml"
                hidden
                ref={fileInputRef}
                onChange={handleFileUpload}
            />

            <Button
                variant="secondary"
                onClick={() => fileInputRef.current?.click()}
                disabled={isPending}
            >
                <Upload className="h-4 w-4 mr-2" />
                {isPending ? 'Importing...' : 'Import XML'}
            </Button>
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
                className="bg-indigo-600 hover:bg-indigo-500 text-white"
            >
                <Plus className="h-4 w-4 mr-2" />
                New Term
            </Button>
        </div>
    );
}
