'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { useState, useRef } from 'react';
import Link from 'next/link';
import { Project } from '@/types';
import { TermRow } from './components/TermRow';
import { CreateTermRow } from './components/CreateTermRow';
import { BatchTranslateButton } from './components/BatchTranslateButton';
import { Search, Upload, Plus, ChevronLeft, ChevronRight, Home } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

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
    // Assuming targetLanguages is a JSON string of array
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
            if (confirm(`Import ${e.target.files[0].name}? This will merge existing keys and move old content to remarks.`)) {
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
                    <div className="flex items-center gap-2 mb-2">
                        <Link href="/" className="text-gray-400 hover:text-white transition-colors">
                            <Home className="h-4 w-4" />
                        </Link>
                        <span className="text-gray-600">/</span>
                        <span className="text-gray-200 text-sm font-medium">{project?.name}</span>
                    </div>
                    <div className="flex items-baseline gap-4">
                        <h1 className="text-3xl font-bold tracking-tight text-white">
                            {project?.name || 'Loading...'}
                        </h1>
                        <Badge variant="outline" className="text-gray-400 border-gray-600">
                            {project?.baseLanguage || 'en-US'}
                        </Badge>
                    </div>
                    <p className="mt-1 text-sm text-gray-400 max-w-2xl">{project?.description}</p>
                </div>
                <div className="flex gap-3">
                    <input
                        type="file"
                        accept=".xml"
                        hidden
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                    />
                    {/* ... */}

                    <Button
                        variant="secondary"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={importMutation.isPending}
                    >
                        <Upload className="h-4 w-4 mr-2" />
                        {importMutation.isPending ? 'Importing...' : 'Import XML'}
                    </Button>
                    <BatchTranslateButton projectId={projectId} targetLanguages={targetLangs} />
                    <Button
                        onClick={() => setIsCreating(true)}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white"
                    >
                        <Plus className="h-4 w-4 mr-2" />
                        New Term
                    </Button>
                </div>
            </div>

            {/* Toolbar */}
            <div className="mb-6 flex gap-4">
                <div className="relative flex-1 max-w-md">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                        <Search className="h-4 w-4 text-gray-500" aria-hidden="true" />
                    </div>
                    <Input
                        type="text"
                        className="pl-10 bg-gray-900 border-gray-700 text-white"
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
            <div className="rounded-md border border-gray-700 bg-gray-900/50 overflow-hidden">
                <Table>
                    <TableHeader className="bg-gray-800">
                        <TableRow className="border-gray-700 hover:bg-gray-800">
                            <TableHead className="text-gray-300 w-48">Key</TableHead>
                            <TableHead className="text-gray-300 w-64">{project?.baseLanguage || 'Base'}</TableHead>
                            {targetLangs.map((lang: string) => (
                                <TableHead key={lang} className="text-gray-300 w-64 hidden xl:table-cell">{lang}</TableHead>
                            ))}
                            <TableHead className="text-gray-300 hidden md:table-cell">Remarks</TableHead>
                            <TableHead className="w-[100px]"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
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
                            <TableRow>
                                <TableCell colSpan={10} className="h-24 text-center text-gray-400">
                                    Loading terms...
                                </TableCell>
                            </TableRow>
                        ) : termsData?.data.length === 0 && !isCreating ? (
                            <TableRow>
                                <TableCell colSpan={10} className="h-24 text-center text-gray-400">
                                    No terms found
                                </TableCell>
                            </TableRow>
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
                    </TableBody>
                </Table>
            </div>

            {/* Pagination */}
            {termsData?.meta && (
                <div className="flex items-center justify-between border-t border-gray-800 bg-gray-900 px-4 py-3 sm:px-6 mt-4 rounded-b-md">
                    <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                        <div>
                            <p className="text-sm text-gray-400">
                                Showing <span className="font-medium">{(page - 1) * 20 + 1}</span> to <span className="font-medium">{Math.min(page * 20, termsData.meta.total)}</span> of <span className="font-medium">{termsData.meta.total}</span> results
                            </p>
                        </div>
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700"
                            >
                                <ChevronLeft className="h-4 w-4 mr-1" /> Previous
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setPage(p => Math.min(termsData.meta.totalPages, p + 1))}
                                disabled={page === termsData.meta.totalPages}
                                className="bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700"
                            >
                                Next <ChevronRight className="h-4 w-4 ml-1" />
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
}
