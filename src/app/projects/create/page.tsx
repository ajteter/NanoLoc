'use client';

import { useRouter } from 'next/navigation';
import { ProjectForm } from '@/components/ProjectForm';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import { SiteHeader } from '@/components/SiteHeader'; // Already in layout, but sometimes useful to ensure context, though layout handles it on server. Wait, client usage in layout is cleaner.

export default function CreateProjectPage() {
    const router = useRouter();
    const queryClient = useQueryClient();

    const mutation = useMutation({
        mutationFn: async (data: any) => {
            const res = await fetch('/api/projects', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...data,
                    visibility: data.visibility ?? 'public',
                }),
            });

            if (!res.ok) {
                const json = await res.json();
                throw new Error(JSON.stringify(json.error) || 'Failed to create project');
            }
            return res.json();
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['projects'] });
            toast.success('Project created successfully');
            router.push(`/projects/${data.project.id}`);
        },
        onError: (err) => {
            toast.error(err.message);
        },
    });

    return (
        <div className="container mx-auto max-w-5xl py-8 px-4 sm:px-6 lg:px-8">
            <div className="mb-8">
                <Link href="/projects" className="flex items-center text-sm text-gray-400 hover:text-white mb-4 transition-colors">
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Back to Projects
                </Link>
                <h1 className="text-3xl font-bold text-white">Create New Project</h1>
                <p className="text-gray-400 mt-2">Initialize a new localization project.</p>
            </div>

            <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-6 sm:p-8">
                <ProjectForm
                    onSubmit={(data) => mutation.mutate(data)}
                    isSubmitting={mutation.isPending}
                    submitLabel="Create Project"
                />
            </div>
        </div>
    );
}
