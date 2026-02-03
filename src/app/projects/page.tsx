'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Project } from '@/types';
// import { formatDistanceToNow } from 'date-fns';

function ProjectList() {
    const { data, isLoading, error } = useQuery<{ projects: Project[] }>({
        queryKey: ['projects'],
        queryFn: async () => {
            const res = await fetch('/api/projects');
            if (!res.ok) throw new Error('Failed to fetch projects');
            return res.json();
        },
    });

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
        return (
            <div className="text-center py-12">
                <h3 className="mt-2 text-sm font-semibold text-white">No projects</h3>
                <p className="mt-1 text-sm text-gray-400">Get started by creating a new project.</p>
                <div className="mt-6">
                    <Link
                        href="/projects/create"
                        className="inline-flex items-center rounded-md bg-indigo-500 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-400"
                    >
                        Create Project
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.projects.map((project) => (
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
                            Updated {project.updatedAt ? new Date(project.updatedAt).toLocaleDateString() : 'Never'}
                        </span>
                    </div>
                </Link>
            ))}
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
                <Link
                    href="/projects/create"
                    className="rounded-md bg-indigo-500 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
                >
                    New Project
                </Link>
            </div>
            <ProjectList />
        </main>
    );
}
