'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { useState, useRef } from 'react';
import Link from 'next/link';
import { Project } from '@/types';
import { TermRow } from './components/TermRow';
import { CreateTermRow } from './components/CreateTermRow';
import { BatchTranslateButton } from './components/BatchTranslateButton';
import { EditProjectDialog } from '@/components/EditProjectDialog';
import { UserNav } from '@/components/UserNav';
import { Search, Upload, Plus, ChevronLeft, ChevronRight, Home, X, ChevronsLeft, ChevronsRight, Wand2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

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
    const [limit, setLimit] = useState(20);
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
                limit: String(limit),
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
            queryClient.invalidateQueries({ queryKey: ['terms', projectId] });
        },
        onError: (err) => {
            // Handled by toast.promise
        }
    });

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const promise = importMutation.mutateAsync(file);
            toast.promise(promise, {
                loading: 'Importing XML...',
                success: (data: any) => `Imported! Added: ${data.added}, Updated: ${data.updated}, Skipped: ${data.skipped}`,
                error: (err: any) => `Import failed: ${err.message}`,
            });
        }
        // Reset input
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleColumnTranslate = async (lang: string) => {
        if (!confirm(`Are you sure you want to translate all missing '${lang}' values? This will consume AI tokens.`)) return;

        const promise = (async () => {
            const res = await fetch(`/api/projects/${projectId}/batch-translate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ targetLanguages: [lang] })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Translation failed');
            return data;
        })();

        toast.promise(promise, {
            loading: `Translating ${lang}...`,
            success: (data) => {
                queryClient.invalidateQueries({ queryKey: ['terms', projectId] });
                // Assuming data.translated[lang] exists
                const count = data.translated ? data.translated[lang] : 0;
                return `Translated ${count} terms for ${lang}`;
            },
            error: (err) => `Translation failed: ${err.message}`
        });
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
                        {project && <EditProjectDialog project={project} />}
                    </div>
                    <p className="mt-1 text-sm text-gray-400 max-w-2xl">{project?.description}</p>
                </div>
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
                        disabled={importMutation.isPending}
                    >
                        <Upload className="h-4 w-4 mr-2" />
                        {importMutation.isPending ? 'Importing...' : 'Import XML'}
                    </Button>
                    <Button
                        variant="secondary"
                        asChild
                    >
                        <Link href={`/api/projects/${projectId}/export`} target="_blank">
                            <Upload className="h-4 w-4 mr-2 rotate-180" /> {/* Reuse upload icon but rotated for download logic visual */}
                            Export CSV
                        </Link>
                    </Button>
                    <BatchTranslateButton projectId={projectId} targetLanguages={targetLangs} />
                    <Button
                        onClick={() => setIsCreating(true)}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white"
                    >
                        <Plus className="h-4 w-4 mr-2" />
                        New Term
                    </Button>
                    <UserNav />
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
                        className="pl-10 pr-10 bg-gray-900 border-gray-700 text-white"
                        placeholder="Search terms, values, or remarks..."
                        value={search}
                        onChange={(e) => {
                            setSearch(e.target.value);
                            setPage(1); // Reset page on search
                        }}
                    />
                    {search && (
                        <button
                            className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 hover:text-white"
                            onClick={() => { setSearch(''); setPage(1); }}
                        >
                            <X className="h-4 w-4" />
                        </button>
                    )}
                </div>
            </div>

            {/* Table */}
            <div className="rounded-md border border-gray-700 bg-gray-900/50 overflow-hidden">
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader className="bg-gray-800">
                            <TableRow className="border-gray-700 hover:bg-gray-800">
                                <TableHead className="w-[100px] bg-gray-900 border-r border-gray-800 sticky left-0 z-20">Actions</TableHead>
                                <TableHead className="text-gray-300 w-48 min-w-[12rem]">Key</TableHead>
                                <TableHead className="text-gray-300 min-w-[12rem]">Remarks</TableHead>
                                <TableHead className="text-gray-300 w-64 min-w-[16rem]">{project?.baseLanguage || 'Base'}</TableHead>
                                {targetLangs.map((lang: string) => (
                                    <TableHead key={lang} className="text-gray-300 w-64 min-w-[16rem]">
                                        <div className="flex items-center gap-2">
                                            {lang}
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-6 w-6 text-indigo-400 hover:text-indigo-300"
                                                onClick={() => handleColumnTranslate(lang)}
                                                title={`Translate all missing ${lang}`}
                                            >
                                                <Wand2 className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    </TableHead>
                                ))}
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
            </div>

            {/* Pagination */}
            {termsData?.meta && (
                <div className="flex items-center justify-between border-t border-gray-800 bg-gray-900 px-4 py-3 sm:px-6 mt-4 rounded-b-md">
                    <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                        <div>
                            <p className="text-sm text-gray-400">
                                Showing <span className="font-medium">{(page - 1) * limit + 1}</span> to <span className="font-medium">{Math.min(page * limit, termsData.meta.total)}</span> of <span className="font-medium">{termsData.meta.total}</span> results

                            </p>
                        </div>
                        <div className="flex items-center gap-4">
                            <select
                                className="bg-gray-800 border-gray-700 text-gray-300 text-sm rounded-md px-2 py-1"
                                value={limit}
                                onChange={(e) => {
                                    setLimit(Number(e.target.value));
                                    setPage(1);
                                }}
                            >
                                <option value={20}>20 / page</option>
                                <option value={50}>50 / page</option>
                                <option value={100}>100 / page</option>
                            </select>
                            <div className="flex gap-1">
                                <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={() => setPage(1)}
                                    disabled={page === 1}
                                    className="bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700 w-8 h-8"
                                    title="First Page"
                                >
                                    <ChevronsLeft className="h-4 w-4" />
                                </Button>
                                <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                    className="bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700 w-8 h-8"
                                    title="Previous Page"
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                </Button>
                                <span className="flex items-center px-2 text-gray-400 text-sm">
                                    {page} / {termsData.meta.totalPages}
                                </span>
                                <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={() => setPage(p => Math.min(termsData.meta.totalPages, p + 1))}
                                    disabled={page === termsData.meta.totalPages}
                                    className="bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700 w-8 h-8"
                                    title="Next Page"
                                >
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                                <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={() => setPage(termsData.meta.totalPages)}
                                    disabled={page === termsData.meta.totalPages}
                                    className="bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700 w-8 h-8"
                                    title="Last Page"
                                >
                                    <ChevronsRight className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )
            }
        </main >
    );
}
