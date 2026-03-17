import { Suspense } from 'react';
import { getProject, listTerms } from '@/lib/services/project.service';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Home, Settings, Loader2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ProjectToolbar } from './components/ProjectToolbar';
import { SearchFilter } from '@/components/SearchFilter';
import { PaginationControls } from './components/PaginationControls';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TermRow } from './components/TermRow';
import { CreateTermRowWrapper } from './components/CreateTermRowWrapper';
import { TranslateColumnHead } from './components/TranslateColumnHead';
import { LANGUAGES } from '@/lib/constants/languages';

const getLangDisplayStr = (code: string) => {
    const lang = LANGUAGES.find(l => l.code === code);
    return lang ? `${lang.name} (${lang.localName}) - ${code}` : code;
};

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

    const targetLangs = project.targetLanguages ? JSON.parse(project.targetLanguages) : [];

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
                            {project.baseLanguage || 'en-US'}
                        </Badge>
                        <Button variant="outline" size="sm" asChild className="text-zinc-300 border-zinc-600 hover:bg-zinc-800 hover:text-white gap-2">
                            <Link href={`/projects/${id}/settings`}>
                                <Settings className="h-4 w-4" />
                                Settings
                            </Link>
                        </Button>
                    </div>
                    <p className="mt-1 text-sm text-zinc-400 max-w-2xl">{project.description}</p>
                </div>

                <ProjectToolbar
                    projectId={id}
                    targetLanguages={targetLangs}
                    baseLanguageDisplay={getLangDisplayStr(project.baseLanguage || 'en-US')}
                />
            </div>

            <div className="mb-6 flex flex-col sm:flex-row gap-4 justify-between items-end sm:items-center">
                <SearchFilter initialSearch={search} />
            </div>

            <Suspense key={`${page}-${search}-${isCreating}`} fallback={<TableLoadingSkeleton targetLangs={targetLangs} baseLang={project.baseLanguage || 'en-US'} />}>
                <TermsTable
                    projectId={id}
                    page={page}
                    limit={limit}
                    search={search}
                    isCreating={isCreating}
                    project={project}
                    targetLangs={targetLangs}
                />
            </Suspense>
        </main>
    );
}

async function TermsTable({ projectId, page, limit, search, isCreating, project, targetLangs }: any) {
    const termsData = await listTerms(projectId, { page, limit, search });

    return (
        <>
            <div className="flex justify-end mb-4">
                <PaginationControls total={termsData.meta.total} page={page} limit={limit} totalPages={termsData.meta.totalPages} />
            </div>

            <div className="rounded-md border border-zinc-700 bg-zinc-900/50 overflow-hidden">
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader className="bg-zinc-800">
                            <TableRow className="border-zinc-700 hover:bg-zinc-800">
                                <TableHead className="w-[100px] min-w-[100px] bg-zinc-900 border-r border-zinc-800 sticky left-0 z-30 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.5)]">Actions</TableHead>
                                <TableHead className="w-[200px] min-w-[200px] bg-zinc-900 border-r border-zinc-800 sticky left-[100px] z-30 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.5)] text-zinc-300">Key</TableHead>
                                <TableHead className="w-[200px] min-w-[200px] bg-zinc-900 border-r border-zinc-800 sticky left-[300px] z-30 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.5)] text-zinc-300">Remarks</TableHead>
                                <TableHead className="text-zinc-300 w-64 min-w-[16rem]">
                                    {getLangDisplayStr(project.baseLanguage || 'en-US')}
                                </TableHead>
                                {targetLangs.map((lang: string) => (
                                    <TranslateColumnHead
                                        key={lang}
                                        projectId={projectId}
                                        lang={lang}
                                        displayStr={getLangDisplayStr(lang)}
                                        baseLanguageDisplay={getLangDisplayStr(project.baseLanguage || 'en-US')}
                                    />
                                ))}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isCreating && (
                                <CreateTermRowWrapper
                                    projectId={projectId}
                                    baseLanguage={project.baseLanguage || 'en-US'}
                                    targetLanguages={targetLangs}
                                />
                            )}

                            {termsData.data.length === 0 && !isCreating ? (
                                <TableRow>
                                    <TableCell colSpan={10} className="h-24 text-center text-zinc-400">
                                        No terms found
                                    </TableCell>
                                </TableRow>
                            ) : (
                                termsData.data.map((term: any) => (
                                    <TermRow
                                        key={term.id}
                                        term={term}
                                        projectId={projectId}
                                        baseLanguage={project.baseLanguage || 'en-US'}
                                        baseLanguageDisplay={getLangDisplayStr(project.baseLanguage || 'en-US')}
                                        targetLanguages={targetLangs}
                                        searchQuery={search}
                                    />
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-end items-start sm:items-center gap-4 mt-4">
                <PaginationControls total={termsData.meta.total} page={page} limit={limit} totalPages={termsData.meta.totalPages} />
            </div>
        </>
    );
}

function TableLoadingSkeleton({ targetLangs, baseLang }: any) {
    return (
        <div className="rounded-md border border-zinc-700 bg-zinc-900/50 overflow-hidden animate-pulse">
            <div className="h-[400px] flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
            </div>
        </div>
    );
}
