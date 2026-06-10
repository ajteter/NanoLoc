import { Suspense } from 'react';
import { getProject, listTerms } from '@/lib/services/project.service';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Home, ImageIcon, Settings, Loader2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ProjectToolbar } from './components/ProjectToolbar';
import { ErrorLogButton } from './components/ErrorLogButton';
import { SearchFilter } from '@/components/SearchFilter';
import { PaginationControls } from './components/PaginationControls';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TermRow } from './components/TermRow';
import { CreateTermRowWrapper } from './components/CreateTermRowWrapper';
import { TranslateColumnHead } from './components/TranslateColumnHead';
import { BaseLanguageColumnHead } from './components/BaseLanguageColumnHead';
import { BaseLanguagePinProvider } from './components/BaseLanguagePinContext';
import { LanguageColumnSelector } from './components/LanguageColumnSelector';
import { SCREENSHOT_COLUMN_WIDTH_CLASS, SCREENSHOT_STICKY_CLASS } from './components/stickyColumnClasses';
import { getLanguageDisplayName, getProjectLanguageCodes, parseVisibleTargetLanguages } from '@/lib/language-utils';
import { cn } from '@/lib/utils';
import type { TranslationKey } from '@/types';

export default async function ProjectDetailPage({
    params,
    searchParams
}: {
    params: Promise<{ id: string }>;
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
    const { id } = await params;
    const resolvedParams = await searchParams;

    const page = typeof resolvedParams?.page === 'string' ? parseInt(resolvedParams.page, 10) : 1;
    const limit = 50;
    const search = typeof resolvedParams?.search === 'string' ? resolvedParams.search : '';
    const isCreating = resolvedParams?.create === 'true';

    const project = await getProject(id);
    if (!project) notFound();

    const { baseLanguage, targetLanguages: allTargetLangs } = getProjectLanguageCodes(project);
    const visibleTargetLangs = parseVisibleTargetLanguages(resolvedParams?.langs, allTargetLangs);

    return (
        <main className="mx-auto max-w-[96rem] px-4 sm:px-6 lg:px-8 py-8 relative">
            <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <Link href="/" className="text-zinc-400 hover:text-white transition-colors">
                            <Home className="h-4 w-4" />
                        </Link>
                        <span className="text-zinc-600">/</span>
                        <span className="text-zinc-200 text-sm font-medium">{project.name}</span>
                    </div>
                    <div className="flex items-baseline gap-4">
                        <h1 className="text-3xl font-bold tracking-tight text-white">
                            {project.name}
                        </h1>
                        <Badge variant="outline" className="text-zinc-400 border-zinc-600">
                            {baseLanguage}
                        </Badge>
                        <Button variant="outline" size="sm" asChild className="text-zinc-300 border-zinc-600 hover:bg-zinc-800 hover:text-white gap-2">
                            <Link href={`/projects/${id}/settings`}>
                                <Settings className="h-4 w-4" />
                                Settings
                            </Link>
                        </Button>
                        <ErrorLogButton projectId={id} />
                    </div>
                    <p className="mt-1 text-sm text-zinc-400 max-w-2xl">{project.description}</p>
                </div>

                <ProjectToolbar
                    projectId={id}
                    baseLanguage={baseLanguage}
                    targetLanguages={allTargetLangs}
                    baseLanguageDisplay={getLanguageDisplayName(baseLanguage)}
                />
            </div>

            <div className="mb-6 flex flex-col sm:flex-row gap-4 justify-between items-end sm:items-center">
                <SearchFilter initialSearch={search} />
                <LanguageColumnSelector
                    targetLanguages={allTargetLangs}
                    visibleTargetLanguages={visibleTargetLangs}
                />
            </div>

            <Suspense key={`${page}-${search}-${isCreating}-${visibleTargetLangs.join(',')}`} fallback={<TableLoadingSkeleton />}>
                <TermsTable
                    projectId={id}
                    page={page}
                    limit={limit}
                    search={search}
                    isCreating={isCreating}
                    baseLanguage={baseLanguage}
                    targetLangs={visibleTargetLangs}
                />
            </Suspense>
        </main>
    );
}

interface TermsTableProps {
    projectId: string;
    page: number;
    limit: number;
    search: string;
    isCreating: boolean;
    baseLanguage: string;
    targetLangs: string[];
}

async function TermsTable({ projectId, page, limit, search, isCreating, baseLanguage, targetLangs }: TermsTableProps) {
    const termsData = await listTerms(projectId, {
        page,
        limit,
        search,
        displayLanguages: [baseLanguage, ...targetLangs],
    });

    return (
        <>
            <div className="flex justify-end mb-4">
                <PaginationControls total={termsData.meta.total} page={page} limit={limit} totalPages={termsData.meta.totalPages} />
            </div>

            <div className="rounded-md border border-zinc-700 bg-zinc-900/50 overflow-hidden">
                <div className="overflow-x-auto">
                    <BaseLanguagePinProvider projectId={projectId}>
                        <Table>
                            <TableHeader className="bg-zinc-800">
                                <TableRow className="border-zinc-700 hover:bg-zinc-800">
                                    <TableHead className="w-[100px] min-w-[100px] bg-zinc-900 border-r border-zinc-800 sticky left-0 z-30 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.5)]">Actions</TableHead>
                                    <TableHead className="w-[200px] min-w-[200px] bg-zinc-900 border-r border-zinc-800 sticky left-[100px] z-30 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.5)] text-zinc-300">Key</TableHead>
                                    <TableHead className="w-[200px] min-w-[200px] bg-zinc-900 border-r border-zinc-800 sticky left-[300px] z-30 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.5)] text-zinc-300">Remarks</TableHead>
                                    <TableHead
                                        className={cn('text-zinc-400', SCREENSHOT_COLUMN_WIDTH_CLASS, SCREENSHOT_STICKY_CLASS.replace('z-20', 'z-30'))}
                                        aria-label="Term screenshot"
                                    >
                                        <ImageIcon className="mx-auto h-4 w-4" />
                                    </TableHead>
                                    <BaseLanguageColumnHead displayStr={getLanguageDisplayName(baseLanguage)} />
                                    {targetLangs.map((lang: string) => (
                                        <TranslateColumnHead
                                            key={lang}
                                            projectId={projectId}
                                            lang={lang}
                                            displayStr={getLanguageDisplayName(lang)}
                                            baseLanguageDisplay={getLanguageDisplayName(baseLanguage)}
                                        />
                                    ))}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isCreating && (
                                    <CreateTermRowWrapper
                                        projectId={projectId}
                                        baseLanguage={baseLanguage}
                                        targetLanguages={targetLangs}
                                    />
                                )}

                                {termsData.data.length === 0 && !isCreating ? (
                                    <TableRow>
                                        <TableCell colSpan={5 + targetLangs.length} className="h-24 text-center text-zinc-400">
                                            No terms found
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    termsData.data.map((term: TranslationKey) => (
                                        <TermRow
                                            key={term.id}
                                            term={term}
                                            projectId={projectId}
                                            baseLanguage={baseLanguage}
                                            baseLanguageDisplay={getLanguageDisplayName(baseLanguage)}
                                            targetLanguages={targetLangs}
                                            searchQuery={search}
                                        />
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </BaseLanguagePinProvider>
                </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-end items-start sm:items-center gap-4 mt-4">
                <PaginationControls total={termsData.meta.total} page={page} limit={limit} totalPages={termsData.meta.totalPages} />
            </div>
        </>
    );
}

function TableLoadingSkeleton() {
    return (
        <div className="rounded-md border border-zinc-700 bg-zinc-900/50 overflow-hidden animate-pulse">
            <div className="h-[400px] flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
            </div>
        </div>
    );
}
