import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Plus, History } from 'lucide-react';
import { listProjects } from '@/lib/services/project.service';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { SearchFilter } from '@/components/SearchFilter';

export const metadata = {
    title: 'Projects - NanoLoc',
};

export default async function ProjectsPage({
    searchParams,
}: {
    searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
    const session = await auth();
    if (!session?.user) {
        redirect('/login');
    }

    const resolvedSearchParams = await searchParams;
    const search = typeof resolvedSearchParams?.search === 'string' ? resolvedSearchParams.search : '';

    const allProjects = await listProjects();

    const filteredProjects = search
        ? allProjects.filter(p =>
            p.name.toLowerCase().includes(search.toLowerCase()) ||
            (p.description && p.description.toLowerCase().includes(search.toLowerCase()))
        )
        : allProjects;

    return (
        <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex items-center justify-between mb-8">
                <h1 className="text-2xl font-bold leading-7 text-white sm:truncate sm:text-3xl sm:tracking-tight">
                    Projects
                </h1>
                <div className="flex items-center gap-3">
                    <Link href="/activity">
                        <Button variant="secondary" className="gap-2">
                            <History className="h-4 w-4" />
                            Activity Log
                        </Button>
                    </Link>
                    <Link
                        href="/projects/create"
                        className="rounded-md bg-indigo-500 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
                    >
                        New Project
                    </Link>
                </div>
            </div>

            <div className="space-y-6">
                <div className="flex items-center gap-3">
                    <SearchFilter initialSearch={search} />
                    <Link href="/projects/create">
                        <Button className="bg-indigo-600 hover:bg-indigo-500 text-white">
                            <Plus className="h-4 w-4 mr-2" />
                            New Project
                        </Button>
                    </Link>
                </div>

                {!filteredProjects || filteredProjects.length === 0 ? (
                    <div className="text-center py-12">
                        <h3 className="mt-2 text-sm font-semibold text-white">No projects found</h3>
                        <p className="mt-1 text-sm text-gray-400">
                            {search ? 'Try adjusting your search query.' : 'Get started by creating a new project.'}
                        </p>
                        <div className="mt-6">
                            <Link href="/projects/create">
                                <Button className="bg-indigo-600 hover:bg-indigo-500 text-white">
                                    <Plus className="h-4 w-4 mr-2" />
                                    Create Project
                                </Button>
                            </Link>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {filteredProjects.map((project) => (
                            <Link
                                key={project.id}
                                href={`/projects/${project.id}`}
                                className="relative flex flex-col gap-2 rounded-lg bg-gray-800 p-6 hover:bg-gray-750 hover:ring-1 hover:ring-indigo-500 transition-all border border-gray-700"
                            >
                                <div className="flex items-center justify-between">
                                    <h3 className="text-lg font-semibold text-white">{project.name}</h3>
                                    <span className="inline-flex items-center rounded-md bg-gray-700 px-2 py-1 text-xs font-medium text-gray-300 ring-1 ring-inset ring-gray-600">
                                        {project.baseLanguage}
                                    </span>
                                </div>
                                <p className="text-sm text-gray-400 line-clamp-2 min-h-[2.5rem]">
                                    {project.description || "No description"}
                                </p>
                                <div className="mt-4 flex items-center text-xs text-gray-500">
                                    <span>
                                        Updated {project.updatedAt ? project.updatedAt.toLocaleDateString() : 'Never'}
                                    </span>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </main>
    );
}
