'use client';

import { useParams, useRouter } from 'next/navigation';
import { ProjectForm } from '@/components/ProjectForm';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ChevronLeft, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { Project } from '@/types';
import { Button } from '@/components/ui/button';

export default function ProjectSettingsPage() {
    const params = useParams();
    const projectId = params.id as string;
    const router = useRouter();
    const queryClient = useQueryClient();

    // Fetch Project (includes canEdit for visibility/edit permission)
    const { data: projectData, isLoading, isError } = useQuery<{ project: Project; canEdit: boolean }>({
        queryKey: ['project', projectId],
        queryFn: async () => {
            const res = await fetch(`/api/projects/${projectId}`);
            if (!res.ok) throw new Error('Failed to fetch project');
            return res.json();
        },
    });

    const project = projectData?.project;
    const canEdit = projectData?.canEdit ?? false;

    // Update Mutation
    const updateMutation = useMutation({
        mutationFn: async (data: any) => {
            const res = await fetch(`/api/projects/${projectId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...data,
                    // If apikey is empty, don't send it to avoid clearing it
                    aiApiKey: data.aiApiKey || undefined
                }),
            });

            if (!res.ok) {
                const json = await res.json();
                throw new Error(JSON.stringify(json.error) || 'Failed to update project');
            }
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['project', projectId] });
            toast.success('Project updated successfully');
            router.push(`/projects/${projectId}`);
        },
        onError: (err) => {
            toast.error(err.message);
        },
    });

    // Delete Mutation
    const deleteMutation = useMutation({
        mutationFn: async () => {
            const res = await fetch(`/api/projects/${projectId}`, {
                method: 'DELETE',
            });
            if (!res.ok) throw new Error('Failed to delete project');
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['projects'] });
            toast.success('Project deleted');
            router.push('/projects');
        },
        onError: (err) => {
            toast.error(err.message);
        }
    });

    const handleDelete = () => {
        if (confirm('Are you sure you want to delete this project? This action cannot be undone.')) {
            deleteMutation.mutate();
        }
    };

    if (isLoading) return <div className="container mx-auto py-12 text-center text-gray-400">Loading settings...</div>;
    if (isError || !project) return <div className="container mx-auto py-12 text-center text-red-500">Failed to load project</div>;

    const initialData = {
        name: project.name,
        description: project.description || '',
        baseLanguage: project.baseLanguage,
        targetLanguages: JSON.parse(project.targetLanguages || '[]'),
        visibility: (project.visibility === 'private' ? 'private' : 'public') as 'public' | 'private',
        aiBaseUrl: project.aiBaseUrl || '',
        aiApiKey: project.aiApiKey || '',
        aiModelId: project.aiModelId || '',
        systemPrompt: project.systemPrompt || '',
    };

    return (
        <div className="container mx-auto max-w-5xl py-8 px-4 sm:px-6 lg:px-8">
            <div className="mb-8">
                <Link href={`/projects/${projectId}`} className="flex items-center text-sm text-gray-400 hover:text-white mb-4 transition-colors">
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Back to Project
                </Link>
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-white">Project Settings</h1>
                        <p className="text-gray-400 mt-2">Manage configuration for <span className="text-white font-medium">{project.name}</span>.</p>
                    </div>
                </div>
            </div>

            {!canEdit && (
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-amber-200 text-sm mb-6">
                    This project is private. Only the owner can change settings or delete it.
                </div>
            )}

            <div className="grid gap-8">
                <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-6 sm:p-8">
                    <ProjectForm
                        initialData={initialData}
                        onSubmit={(data) => updateMutation.mutate(data)}
                        isSubmitting={updateMutation.isPending}
                        submitLabel="Save Changes"
                        visibilityReadOnly={!canEdit}
                        formReadOnly={!canEdit}
                    />
                </div>

                {canEdit && (
                    <div className="bg-red-950/20 border border-red-900/50 rounded-lg p-6 sm:p-8">
                        <h3 className="text-lg font-medium text-red-400 mb-2">Danger Zone</h3>
                        <p className="text-gray-400 text-sm mb-4">Deleting this project will permanently remove all terms and translations.</p>
                        <Button
                            variant="destructive"
                            onClick={handleDelete}
                            disabled={deleteMutation.isPending}
                        >
                            <Trash2 className="h-4 w-4 mr-2" />
                            {deleteMutation.isPending ? 'Deleting...' : 'Delete Project'}
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
}
