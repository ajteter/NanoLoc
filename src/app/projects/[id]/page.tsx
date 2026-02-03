'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { useState, useRef } from 'react';
import Link from 'next/link';
import { Project } from '@/types';
import { TermRow } from './components/TermRow';
import { CreateTermRow } from './components/CreateTermRow';
// Lucide icons imports (assuming lucide-react is installed as per previous summary)
import { Search, Upload, Plus, Globe, Edit2, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';

interface TranslationValue {
    id: string;
    languageCode: string;
    content: string;
}

interface TranslationKey {
    id: string;
    stringName: string;
    remarks: string | null;
    values: TranslationValue[];
    updatedAt: string;
}

interface TermsResponse {
    data: TranslationKey[];
    meta: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
}

export default function ProjectDetailPage() {
    const params = useParams();
    const projectId = params.id as string;
    const queryClient = useQueryClient();

    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Fetch Project Info
    const { data: projectData } = useQuery<{ project: Project }>({
        queryKey: ['project', projectId],
        queryFn: async () => {
            const res = await fetch(`/api/projects/${projectId}`);
            if (!res.ok) throw new Error('Failed to fetch project');
            return res.json();
        },
    });

    // Fetch Terms
    const { data: termsData, isLoading } = useQuery<TermsResponse>({
        queryKey: ['terms', projectId, page, search],
        queryFn: async () => {
            const searchParams = new URLSearchParams({
                page: String(page),
                limit: '20',
                search,
            });
            const res = await fetch(`/api/projects/${projectId}/terms?${searchParams}`);
            if (!res.ok) throw new Error('Failed to fetch terms');
            return res.json();
        },
        placeholderData: (previousData) => previousData, // Keep previous data while fetching
    });

    const project = projectData?.project;
    const targetLangs = project?.targetLanguages ? JSON.parse(project.targetLanguages) : [];

    // Import Mutation
    const importMutation = useMutation({
        mutationFn: async (file: File) => {
            const formData = new FormData();
            formData.append('file', file);
            const res = await fetch(`/api/projects/${projectId}/import`, {
                method: 'POST',
                body: formData,
            });
            if (!res.ok) throw new Error('Import failed');
            return res.json();
        },
        onSuccess: (data) => {
            alert(`Imported! Added: ${data.added}, Updated: ${data.updated}, Skipped: ${data.skipped}`);
            queryClient.invalidateQueries({ queryKey: ['terms', projectId] });
        },
        onError: (err) => {
            alert('Import failed: ' + err.message);
        }
    });

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            if (confirm(`Import ${e.target.files[0].name}?`)) {
                importMutation.mutate(e.target.files[0]);
            }
        }
        // Reset input
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    return (
        <main className="mx-auto max-w-[96rem] px-4 sm:px-6 lg:px-8 py-8">
            {/* Header */}
            <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <Link href="/projects" className="text-gray-400 hover:text-white text-sm">Projects</Link>
                        <span className="text-gray-600">/</span>
                        <span className="text-gray-200 text-sm font-medium">{project?.name}</span>
                    </div>
                    <h1 className="text-2xl font-bold leading-7 text-white sm:truncate sm:text-3xl sm:tracking-tight">
                        {project?.name || 'Loading...'}
                    </h1>
                    <p className="mt-1 text-sm text-gray-400">{project?.description}</p>
                </div>
                <div className="flex gap-3">
                    <input
                        type="file"
                        accept=".xml"
                        hidden
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                    />
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={importMutation.isPending}
                        className="inline-flex items-center gap-2 rounded-md bg-white/10 px-3.5 py-2.5 text-sm font-semibold text-white hover:bg-white/20"
                    >
                        <Upload className="h-4 w-4" />
                        {importMutation.isPending ? 'Importing...' : 'Import XML'}
                    </button>
                    <button
                        onClick={() => setIsCreating(true)}
                        className="inline-flex items-center gap-2 rounded-md bg-indigo-500 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-400"
                    >
                        <Plus className="h-4 w-4" />
                        New Term
                    </button>
                </div>
            </div>

            {/* Toolbar */}
            <div className="mb-6 flex gap-4">
                <div className="relative flex-1 max-w-md">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                        <Search className="h-5 w-5 text-gray-400" aria-hidden="true" />
                    </div>
                    <input
                        type="text"
                        className="block w-full rounded-md border-0 bg-gray-800 py-2 pl-10 text-white shadow-sm ring-1 ring-inset ring-gray-700 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-500 sm:text-sm sm:leading-6"
                        placeholder="Search terms, values, or remarks..."
                        value={search}
                        onChange={(e) => {
                            setSearch(e.target.value);
                            setPage(1); // Reset page on search
                        }}
                    />
                </div>
            </div>

            {/* Table */}
            <div className="mt-8 flow-root">
                <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
                    <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
                        <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 rounded-lg border border-gray-700 bg-gray-900/50">
                            <table className="min-w-full divide-y divide-gray-800">
                                <thead className="bg-gray-800">
                                    <tr>
                                        <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-white sm:pl-6 w-48">
                                            Key
                                        </th>
                                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-white w-64">
                                            {project?.baseLanguage || 'Base'}
                                        </th>
                                        {/* Render Target Language Columns */}
                                        {targetLangs.map((lang: string) => (
                                            <th key={lang} scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-white w-64 hidden xl:table-cell">
                                                {lang}
                                            </th>
                                        ))}
                                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-white hidden md:table-cell">
                                            Remarks
                                        </th>
                                        <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                                            <span className="sr-only">Edit</span>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-800 bg-gray-900">
                                    {isCreating && (
                                        <CreateTermRow
                                            projectId={projectId}
                                            baseLanguage={project?.baseLanguage || 'en-US'}
                                            targetLanguages={targetLangs}
                                            onCancel={() => setIsCreating(false)}
                                            onSuccess={() => setIsCreating(false)}
                                        />
                                    )}
                                    {isLoading ? (
                                        <tr><td colSpan={10} className="text-center py-10 text-gray-400">Loading terms...</td></tr>
                                    ) : termsData?.data.length === 0 && !isCreating ? (
                                        <tr><td colSpan={10} className="text-center py-10 text-gray-400">No terms found</td></tr>
                                    ) : (
                                        termsData?.data.map((term) => (
                                            <TermRow
                                                key={term.id}
                                                term={term}
                                                projectId={projectId}
                                                baseLanguage={project?.baseLanguage || 'en-US'}
                                                targetLanguages={targetLangs}
                                            />
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Pagination */}
                {termsData?.meta && (
                    <div className="flex items-center justify-between border-t border-gray-800 bg-gray-900 px-4 py-3 sm:px-6 mt-4">
                        <div className="flex flex-1 justify-between sm:hidden">
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="relative inline-flex items-center rounded-md border border-gray-700 bg-gray-800 px-4 py-2 text-sm font-medium text-gray-300 hover:bg-gray-700 disabled:opacity-50"
                            >
                                Previous
                            </button>
                            <button
                                onClick={() => setPage(p => Math.min(termsData.meta.totalPages, p + 1))}
                                disabled={page === termsData.meta.totalPages}
                                className="relative ml-3 inline-flex items-center rounded-md border border-gray-700 bg-gray-800 px-4 py-2 text-sm font-medium text-gray-300 hover:bg-gray-700 disabled:opacity-50"
                            >
                                Next
                            </button>
                        </div>
                        <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                            <div>
                                <p className="text-sm text-gray-400">
                                    Showing <span className="font-medium">{(page - 1) * 20 + 1}</span> to <span className="font-medium">{Math.min(page * 20, termsData.meta.total)}</span> of <span className="font-medium">{termsData.meta.total}</span> results
                                </p>
                            </div>
                            <div>
                                <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                                    <button
                                        onClick={() => setPage(p => Math.max(1, p - 1))}
                                        disabled={page === 1}
                                        className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-700 hover:bg-gray-800 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                                    >
                                        <span className="sr-only">Previous</span>
                                        <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                                    </button>
                                    <span className="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-white ring-1 ring-inset ring-gray-700 focus:outline-offset-0">
                                        {page}
                                    </span>
                                    <button
                                        onClick={() => setPage(p => Math.min(termsData.meta.totalPages, p + 1))}
                                        disabled={page === termsData.meta.totalPages}
                                        className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-700 hover:bg-gray-800 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                                    >
                                        <span className="sr-only">Next</span>
                                        <ChevronRight className="h-5 w-5" aria-hidden="true" />
                                    </button>
                                </nav>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </main>
    );
}
