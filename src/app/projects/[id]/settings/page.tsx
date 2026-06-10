'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ProjectForm } from '@/components/ProjectForm';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ChevronLeft, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { Project, ProjectFormData } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getProjectLanguageCodes } from '@/lib/language-utils';
import { useI18n } from '@/lib/i18n/client';
import { getLocalizedApiError, readApiErrorBody } from '@/lib/api/errors';

export default function ProjectSettingsPage() {
    const { t } = useI18n();
    const params = useParams();
    const projectId = params.id as string;
    const router = useRouter();
    const queryClient = useQueryClient();
    const [deleteConfirm, setDeleteConfirm] = useState(false);
    const [deleteInput, setDeleteInput] = useState('');

    // Fetch Project
    const { data: projectData, isLoading, isError } = useQuery<{ project: Project }>({
        queryKey: ['project', projectId],
        queryFn: async () => {
            const res = await fetch(`/api/projects/${projectId}`);
            if (!res.ok) {
                const json = await readApiErrorBody(res);
                throw new Error(getLocalizedApiError(json, t, t('projectSettings.loadFailed')));
            }
            return res.json();
        },
    });

    const project = projectData?.project;

    // Update Mutation
    const updateMutation = useMutation({
        mutationFn: async (data: ProjectFormData) => {
            const res = await fetch(`/api/projects/${projectId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...data,
                    aiApiKey: data.aiApiKey || undefined
                }),
            });

            if (!res.ok) {
                const json = await readApiErrorBody(res);
                throw new Error(getLocalizedApiError(json, t, t('projectSettings.failed')));
            }
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['project', projectId] });
            toast.success(t('projectSettings.success'));
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
            if (!res.ok) {
                const json = await readApiErrorBody(res);
                throw new Error(getLocalizedApiError(json, t, t('projectSettings.deleteFailed')));
            }
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['projects'] });
            toast.success(t('projectSettings.deleted'));
            router.push('/projects');
        },
        onError: (err) => {
            toast.error(err.message);
        }
    });

    if (isLoading) return <div className="container mx-auto py-12 text-center text-zinc-400">{t('projectSettings.loading')}</div>;
    if (isError || !project) return <div className="container mx-auto py-12 text-center text-red-500">{t('projectSettings.loadFailed')}</div>;

    const { targetLanguages } = getProjectLanguageCodes(project);

    const initialData = {
        name: project.name,
        description: project.description || '',
        baseLanguage: project.baseLanguage,
        targetLanguages,
        aiBaseUrl: project.aiBaseUrl || '',
        aiApiKey: project.aiApiKey || '',
        aiModelId: project.aiModelId || '',
        systemPrompt: project.systemPrompt || '',
    };

    const [projectDescriptionPrefix, projectDescriptionSuffix = ''] = t('projectSettings.description').split('{name}');
    const [deleteConfirmPrefix, deleteConfirmSuffix = ''] = t('projectSettings.deleteConfirmPrompt').split('{name}');

    return (
        <div className="container mx-auto max-w-5xl py-8 px-4 sm:px-6 lg:px-8">
            <div className="mb-8">
                <Link href={`/projects/${projectId}`} className="flex items-center text-sm text-zinc-400 hover:text-white mb-4 transition-colors">
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    {t('projectSettings.back')}
                </Link>
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-white">{t('projectSettings.title')}</h1>
                        <p className="text-zinc-400 mt-2">
                            {projectDescriptionPrefix}
                            <span className="text-white font-medium">{project.name}</span>
                            {projectDescriptionSuffix}
                        </p>
                    </div>
                </div>
            </div>

            <div className="grid gap-8">
                <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-6 sm:p-8">
                    <ProjectForm
                        initialData={initialData}
                        onSubmit={(data) => updateMutation.mutate(data)}
                        isSubmitting={updateMutation.isPending}
                        submitLabel={t('common.saveChanges')}
                    />
                </div>

                <div className="bg-red-950/20 border border-red-900/50 rounded-lg p-6 sm:p-8">
                    <h3 className="text-lg font-medium text-red-400 mb-2">{t('projectSettings.dangerZone')}</h3>
                    <p className="text-zinc-400 text-sm mb-4">{t('projectSettings.dangerDescription')}</p>

                    {deleteConfirm ? (
                        <div className="space-y-3 max-w-md">
                            <p className="text-sm text-red-300">
                                {deleteConfirmPrefix}
                                <span className="font-mono font-bold text-white">{project.name}</span>
                                {deleteConfirmSuffix}
                            </p>
                            <Input
                                value={deleteInput}
                                onChange={(e) => setDeleteInput(e.target.value)}
                                className="bg-zinc-900 border-red-700 text-white"
                                autoFocus
                                placeholder={t('projectSettings.deletePlaceholder')}
                            />
                            <div className="flex gap-2">
                                <Button
                                    variant="destructive"
                                    onClick={() => deleteMutation.mutate()}
                                    disabled={deleteInput !== project.name || deleteMutation.isPending}
                                >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    {deleteMutation.isPending ? t('common.deleting') : t('projectSettings.confirmDelete')}
                                </Button>
                                <Button
                                    variant="ghost"
                                    onClick={() => { setDeleteConfirm(false); setDeleteInput(''); }}
                                    className="text-zinc-400"
                                >
                                    {t('common.cancel')}
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <Button
                            variant="destructive"
                            onClick={() => setDeleteConfirm(true)}
                        >
                            <Trash2 className="h-4 w-4 mr-2" />
                            {t('projectSettings.deleteProject')}
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
}
