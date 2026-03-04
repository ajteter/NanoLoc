'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Project } from '@/types';
import { Button } from '@/components/ui/button';
import { Search, Plus, History } from 'lucide-react';

function ProjectList() {
    const [search, setSearch] = useState('');
    const { data, isLoading, error } = useQuery<{ projects: Project[] }>({
        queryKey: ['projects'],
        queryFn: async () => {
            const res = await fetch('/api/projects');
            if (!res.ok) throw new Error('Failed to fetch projects');
            return res.json();
        },
    });

    // ... (isLoading and error checks remain same)

    if (isLoading) {
        return (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="animate-pulse bg-gray-800 h-40 rounded-lg"></div>
                ))}
            </div>
        );
    }

    if (error) {
        return <div className="text-red-500">Error loading projects</div>;
    }

    if (!data?.projects || data.projects.length === 0) {
        // ... (no projects view)
        return (
            <div className="text-center py-12">
                <h3 className="mt-2 text-sm font-semibold text-white">No projects</h3>
                {/* ... */}
                <div className="mt-6">
                    <Link href="/projects/create">
                        <Button className="bg-indigo-600 hover:bg-indigo-500 text-white">
                            <Plus className="h-4 w-4 mr-2" />
                            Create Project
                        </Button>
                    </Link>
                </div>
            </div>
        );
    }

    // Filter projects
    const filteredProjects = data.projects.filter(p =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        (p.description && p.description.toLowerCase().includes(search.toLowerCase()))
    );

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <div className="relative flex-1 max-w-sm">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                        <Search className="h-5 w-5 text-gray-500" aria-hidden="true" />
                    </div>
                    <input
                        type="text"
                        name="search"
                        id="search"
                        className="block w-full rounded-md border-0 bg-gray-800 py-1.5 pl-10 text-white placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-500 sm:text-sm sm:leading-6"
                        placeholder="Search projects"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <Link href="/projects/create">
                    <Button className="bg-indigo-600 hover:bg-indigo-500 text-white">
                        <Plus className="h-4 w-4 mr-2" />
                        New Project
                    </Button>
                </Link>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filteredProjects.map((project) => (
                    <Link
                        key={project.id}
                        href={`/projects/${project.id}`}
                        className="relative flex flex-col gap-2 rounded-lg bg-gray-800 p-6 hover:bg-gray-750 hover:ring-1 hover:ring-indigo-500 transition-all border border-gray-700"
                    >
                        {/* ... card content ... */}
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
                                Updated {project.updatedAt ? new Date(project.updatedAt).toLocaleDateString() : 'Never'}
                            </span>
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
}

export default function ProjectsPage() {
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
            <ProjectList />
        </main>
    );
}
