'use client';

import { useQuery, useMutation, useQueryClient, useIsMutating } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { useState, useRef } from 'react';
import Link from 'next/link';
import { Project, TranslationKey } from '@/types';
import { TermRow } from './components/TermRow';
import { CreateTermRow } from './components/CreateTermRow';
import { BatchTranslateButton } from './components/BatchTranslateButton';
// import { EditProjectDialog } from '@/components/EditProjectDialog'; // Deleted
import { UserNav } from '@/components/UserNav';
import { Search, Upload, Plus, ChevronLeft, ChevronRight, Home, X, ChevronsLeft, ChevronsRight, Wand2, Settings, Loader2, Globe, Lock } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { LANGUAGES } from '@/lib/constants/languages';

// Local interfaces removed, using global types
interface TermsResponse {
    data: TranslationKey[];
    meta: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
}

// Helper to format language
const getLangDisplay = (code: string) => {
    const lang = LANGUAGES.find(l => l.code === code);
    return lang ? `${lang.name} (${lang.localName}) - ${code}` : code;
};

export default function ProjectDetailPage() {
    const params = useParams();
    const projectId = params.id as string;
    const queryClient = useQueryClient();

    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(50);
    const [search, setSearch] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Global busy state
    const mutationCount = useIsMutating();
    const isTranslating = mutationCount > 0;

    // Fetch Project Info
    const { data: projectData, isLoading: isLoadingProject, isError: isProjectError, error: projectError } = useQuery<{ project: Project; canEdit: boolean }>({
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
    const canEdit = projectData?.canEdit ?? false;
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
            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                throw new Error(errorData.error || `Import failed with status ${res.status}`);
            }
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

    const columnTranslateMutation = useMutation({
        mutationFn: async (lang: string) => {
            const res = await fetch(`/api/projects/${projectId}/batch-translate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ targetLanguages: [lang] })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Translation failed');
            return { data, lang };
        },
        onSuccess: ({ data, lang }) => {
            queryClient.invalidateQueries({ queryKey: ['terms', projectId] });
        },
        onError: (err) => {
            // Error handled in promise/toast usually, but we need to ensure it bubbles if using mutateAsync
        }
    });

    const handleColumnTranslate = async (lang: string) => {
        if (!confirm(`Are you sure you want to translate all missing '${lang}' values? This will consume AI tokens.`)) return;

        const promise = columnTranslateMutation.mutateAsync(lang);

        toast.promise(promise, {
            loading: `Translating ${lang}...`,
            success: ({ data, lang }) => {
                const count = data.translated ? data.translated[lang] : 0;
                return `Translated ${count} terms for ${lang}`;
            },
            error: (err) => `Translation failed: ${err.message}`
        });
    };

    return (
        <main className="mx-auto max-w-[96rem] px-4 sm:px-6 lg:px-8 py-8 relative">
            {/* Global Busy Indicator */}
            {isTranslating && (
                <div className="fixed top-0 left-0 right-0 z-[100] bg-orange-600 text-white px-4 py-3 shadow-lg font-medium animate-pulse flex items-center justify-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span className="text-lg">Translating in progress... Please do not perform any operations.</span>
                </div>
            )}

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
                            {isProjectError ? (
                                <span className="text-red-500 text-xl">Error: {projectError?.message || 'Failed to load'}</span>
                            ) : isLoadingProject ? (
                                'Loading...'
                            ) : (
                                project?.name
                            )}
                        </h1>
                        <Badge variant="outline" className="text-gray-400 border-gray-600">
                            {project?.baseLanguage || 'en-US'}
                        </Badge>
                        {project && (
                            <Badge variant="outline" className={project.visibility === 'private' ? 'text-amber-400 border-amber-500/50' : 'text-indigo-400 border-indigo-500/50'}>
                                {project.visibility === 'private' ? <Lock className="h-3 w-3 mr-1" /> : <Globe className="h-3 w-3 mr-1" />}
                                {project.visibility === 'private' ? 'Private' : 'Public'}
                            </Badge>
                        )}
                        <Button variant="outline" size="sm" asChild className="text-gray-300 border-gray-600 hover:bg-gray-800 hover:text-white gap-2">
                            <Link href={`/projects/${projectId}/settings`}>
                                <Settings className="h-4 w-4" />
                                Settings
                            </Link>
                        </Button>
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

                    {canEdit && (
                        <Button
                            variant="secondary"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={importMutation.isPending}
                        >
                            <Upload className="h-4 w-4 mr-2" />
                            {importMutation.isPending ? 'Importing...' : 'Import XML'}
                        </Button>
                    )}
                    <Button
                        variant="secondary"
                        asChild
                    >
                        <Link href={`/api/projects/${projectId}/export`} target="_blank">
                            <Upload className="h-4 w-4 mr-2 rotate-180" />
                            Export CSV
                        </Link>
                    </Button>
                    {canEdit && <BatchTranslateButton projectId={projectId} targetLanguages={targetLangs} />}
                    {canEdit && (
                        <Button
                            onClick={() => setIsCreating(true)}
                            className="bg-indigo-600 hover:bg-indigo-500 text-white"
                        >
                            <Plus className="h-4 w-4 mr-2" />
                            New Term
                        </Button>
                    )}
                </div>
            </div>

            {/* Toolbar */}
            <div className="mb-6 flex flex-col sm:flex-row gap-4 justify-between items-end sm:items-center">
                <div className="relative flex-1 max-w-md w-full">
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
                            setPage(1);
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

                {/* Pagination Controls (Top Right) */}
                {termsData?.meta && (
                    <div className="flex items-center gap-4 bg-gray-900 p-2 rounded-md border border-gray-700 shadow-sm shrink-0">
                        <span className="text-sm text-gray-400 hidden lg:inline-block">
                            {(page - 1) * limit + 1}-{Math.min(page * limit, termsData.meta.total)} of {termsData.meta.total}
                        </span>

                        <div className="flex items-center gap-2">
                            <div className="flex gap-1">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setPage(1)}
                                    disabled={page === 1 || isLoading}
                                    className="h-8 w-8 text-gray-400 hover:text-white"
                                    title="First Page"
                                >
                                    <ChevronsLeft className="h-4 w-4" />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    disabled={page === 1 || isLoading}
                                    className="h-8 w-8 text-gray-400 hover:text-white"
                                    title="Previous Page"
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                </Button>
                                <span className="flex items-center px-2 text-gray-300 text-sm font-medium min-w-[3rem] justify-center">
                                    {page} / {termsData.meta.totalPages}
                                </span>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setPage(p => Math.min(termsData.meta.totalPages, p + 1))}
                                    disabled={page === termsData.meta.totalPages || isLoading}
                                    className="h-8 w-8 text-gray-400 hover:text-white"
                                    title="Next Page"
                                >
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setPage(termsData.meta.totalPages)}
                                    disabled={page === termsData.meta.totalPages || isLoading}
                                    className="h-8 w-8 text-gray-400 hover:text-white"
                                    title="Last Page"
                                >
                                    <ChevronsRight className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Table */}
            <div className="rounded-md border border-gray-700 bg-gray-900/50 overflow-hidden">
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader className="bg-gray-800">
                            <TableRow className="border-gray-700 hover:bg-gray-800">
                                <TableHead className="w-[100px] min-w-[100px] bg-gray-900 border-r border-gray-800 sticky left-0 z-30 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.5)]">Actions</TableHead>
                                <TableHead className="w-[200px] min-w-[200px] bg-gray-900 border-r border-gray-800 sticky left-[100px] z-30 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.5)] text-gray-300">Key</TableHead>
                                <TableHead className="w-[200px] min-w-[200px] bg-gray-900 border-r border-gray-800 sticky left-[300px] z-30 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.5)] text-gray-300">Remarks</TableHead>
                                <TableHead className="text-gray-300 w-64 min-w-[16rem]">
                                    {getLangDisplay(project?.baseLanguage || 'en-US')}
                                </TableHead>
                                {targetLangs.map((lang: string) => (
                                    <TableHead key={lang} className="text-gray-300 w-64 min-w-[16rem]">
                                        <div className="flex items-center gap-2">
                                            <span className="truncate" title={getLangDisplay(lang)}>
                                                {getLangDisplay(lang)}
                                            </span>
                                            {canEdit && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-6 w-6 text-indigo-400 hover:text-indigo-300 shrink-0"
                                                    onClick={() => handleColumnTranslate(lang)}
                                                    title={`Translate all missing ${lang}`}
                                                >
                                                    <Wand2 className="h-3 w-3" />
                                                </Button>
                                            )}
                                        </div>
                                    </TableHead>
                                ))}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isCreating && canEdit && (
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
                                        canEdit={canEdit}
                                    />
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </main>
    );
}
