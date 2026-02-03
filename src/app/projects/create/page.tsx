'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';

export default function CreateProjectPage() {
    const router = useRouter();
    const queryClient = useQueryClient();
    const [error, setError] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        name: '',
        description: '',
        baseLanguage: 'en-US',
        targetLanguages: '', // comma separated
        aiBaseUrl: '',
        aiApiKey: '',
        aiModelId: '',
    });

    const mutation = useMutation({
        mutationFn: async (data: any) => {
            const res = await fetch('/api/projects', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...data,
                    targetLanguages: data.targetLanguages.split(',').map((s: string) => s.trim()).filter(Boolean),
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
            router.push(`/projects`);
        },
        onError: (err) => {
            setError(err.message);
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        mutation.mutate(formData);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    };

    return (
        <main className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-8">
            <div className="mb-8">
                <h1 className="text-2xl font-bold leading-7 text-white sm:truncate sm:text-3xl sm:tracking-tight">
                    Create New Project
                </h1>
                <p className="mt-2 text-sm text-gray-400">
                    Configure your project settings and AI translation backend.
                </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6 bg-gray-800 p-8 rounded-lg border border-gray-700 shadow-xl">
                <div className="space-y-12">
                    <div className="border-b border-gray-100/10 pb-12">
                        <h2 className="text-base font-semibold leading-7 text-white">Project Details</h2>
                        <p className="mt-1 text-sm leading-6 text-gray-400">Basic information about your translation project.</p>

                        <div className="mt-10 grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-6">
                            <div className="sm:col-span-4">
                                <label htmlFor="name" className="block text-sm font-medium leading-6 text-white">
                                    Project Name
                                </label>
                                <div className="mt-2">
                                    <div className="flex rounded-md bg-white/5 ring-1 ring-inset ring-white/10 focus-within:ring-2 focus-within:ring-inset focus-within:ring-indigo-500">
                                        <input
                                            type="text"
                                            name="name"
                                            id="name"
                                            required
                                            value={formData.name}
                                            onChange={handleChange}
                                            className="flex-1 border-0 bg-transparent py-1.5 pl-3 text-white focus:ring-0 sm:text-sm sm:leading-6"
                                            placeholder="My Awesome App"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="col-span-full">
                                <label htmlFor="description" className="block text-sm font-medium leading-6 text-white">
                                    Description
                                </label>
                                <div className="mt-2">
                                    <textarea
                                        id="description"
                                        name="description"
                                        rows={3}
                                        value={formData.description}
                                        onChange={handleChange}
                                        className="block w-full rounded-md border-0 bg-white/5 py-1.5 text-white shadow-sm ring-1 ring-inset ring-white/10 focus:ring-2 focus:ring-inset focus:ring-indigo-500 sm:text-sm sm:leading-6"
                                        placeholder="Android application..."
                                    />
                                </div>
                            </div>

                            <div className="sm:col-span-3">
                                <label htmlFor="baseLanguage" className="block text-sm font-medium leading-6 text-white">
                                    Base Language
                                </label>
                                <div className="mt-2">
                                    <div className="flex rounded-md bg-white/5 ring-1 ring-inset ring-white/10 focus-within:ring-2 focus-within:ring-inset focus-within:ring-indigo-500">
                                        <input
                                            type="text"
                                            name="baseLanguage"
                                            id="baseLanguage"
                                            value={formData.baseLanguage}
                                            onChange={handleChange}
                                            className="flex-1 border-0 bg-transparent py-1.5 pl-3 text-white focus:ring-0 sm:text-sm sm:leading-6"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="sm:col-span-3">
                                <label htmlFor="targetLanguages" className="block text-sm font-medium leading-6 text-white">
                                    Target Languages
                                </label>
                                <div className="mt-2">
                                    <div className="flex rounded-md bg-white/5 ring-1 ring-inset ring-white/10 focus-within:ring-2 focus-within:ring-inset focus-within:ring-indigo-500">
                                        <input
                                            type="text"
                                            name="targetLanguages"
                                            id="targetLanguages"
                                            value={formData.targetLanguages}
                                            onChange={handleChange}
                                            className="flex-1 border-0 bg-transparent py-1.5 pl-3 text-white focus:ring-0 sm:text-sm sm:leading-6"
                                            placeholder="zh-CN, ja, es"
                                        />
                                    </div>
                                    <p className="mt-1 text-xs text-gray-500">Comma separated codes (e.g. zh-CN, ja)</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="border-b border-gray-100/10 pb-12">
                        <h2 className="text-base font-semibold leading-7 text-white">AI Configuration</h2>
                        <p className="mt-1 text-sm leading-6 text-gray-400">
                            Override system defaults for this project. Keep empty to use environment variables.
                        </p>

                        <div className="mt-10 grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-6">
                            <div className="sm:col-span-4">
                                <label htmlFor="aiBaseUrl" className="block text-sm font-medium leading-6 text-white">
                                    Base URL
                                </label>
                                <div className="mt-2">
                                    <div className="flex rounded-md bg-white/5 ring-1 ring-inset ring-white/10 focus-within:ring-2 focus-within:ring-inset focus-within:ring-indigo-500">
                                        <input
                                            type="text"
                                            name="aiBaseUrl"
                                            id="aiBaseUrl"
                                            value={formData.aiBaseUrl}
                                            onChange={handleChange}
                                            className="flex-1 border-0 bg-transparent py-1.5 pl-3 text-white focus:ring-0 sm:text-sm sm:leading-6"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="sm:col-span-4">
                                <label htmlFor="aiModelId" className="block text-sm font-medium leading-6 text-white">
                                    Model ID
                                </label>
                                <div className="mt-2">
                                    <div className="flex rounded-md bg-white/5 ring-1 ring-inset ring-white/10 focus-within:ring-2 focus-within:ring-inset focus-within:ring-indigo-500">
                                        <input
                                            type="text"
                                            name="aiModelId"
                                            id="aiModelId"
                                            value={formData.aiModelId}
                                            onChange={handleChange}
                                            className="flex-1 border-0 bg-transparent py-1.5 pl-3 text-white focus:ring-0 sm:text-sm sm:leading-6"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="col-span-full">
                                <label htmlFor="aiApiKey" className="block text-sm font-medium leading-6 text-white">
                                    API Key
                                </label>
                                <div className="mt-2">
                                    <div className="flex rounded-md bg-white/5 ring-1 ring-inset ring-white/10 focus-within:ring-2 focus-within:ring-inset focus-within:ring-indigo-500">
                                        <input
                                            type="password"
                                            name="aiApiKey"
                                            id="aiApiKey"
                                            value={formData.aiApiKey}
                                            onChange={handleChange}
                                            className="flex-1 border-0 bg-transparent py-1.5 pl-3 text-white focus:ring-0 sm:text-sm sm:leading-6"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {error && (
                    <div className="rounded-md bg-red-500/10 p-4">
                        <div className="flex">
                            <div className="ml-3">
                                <h3 className="text-sm font-medium text-red-500">Error</h3>
                                <div className="text-sm text-red-500/90 mt-2">{error}</div>
                            </div>
                        </div>
                    </div>
                )}

                <div className="mt-6 flex items-center justify-end gap-x-6">
                    <Link href="/projects" className="text-sm font-semibold leading-6 text-white">
                        Cancel
                    </Link>
                    <button
                        type="submit"
                        disabled={mutation.isPending}
                        className="rounded-md bg-indigo-500 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 disabled:opacity-50"
                    >
                        {mutation.isPending ? 'Creating...' : 'Create Project'}
                    </button>
                </div>
            </form>
        </main>
    );
}
