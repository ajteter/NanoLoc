'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Project } from '@/types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { UserNav } from '@/components/UserNav';
import { Button } from '@/components/ui/button';
import { Plus, Globe, Lock } from 'lucide-react';

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
          <div key={i} className="animate-pulse bg-gray-800/50 h-40 rounded-lg border border-gray-700"></div>
        ))}
      </div>
    );
  }

  if (error) {
    return <div className="text-red-500 bg-red-500/10 p-4 rounded-md">Error loading projects</div>;
  }

  if (!data?.projects || data.projects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] border border-dashed border-gray-700 rounded-lg bg-gray-900/50">
        <h3 className="text-lg font-semibold text-white">No projects found</h3>
        <p className="mt-1 text-sm text-gray-400">Get started by creating your first project.</p>
        <div className="mt-6">
          <Link href="/projects/create">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Project
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {data.projects.map((project) => (
        <Link key={project.id} href={`/projects/${project.id}`} className="block transition-transform hover:scale-[1.02]">
          <Card className="bg-gray-800 border-gray-700 hover:border-indigo-500 hover:shadow-lg transition-all h-full">
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start gap-2">
                <CardTitle className="text-white text-lg truncate flex-1 min-w-0">{project.name}</CardTitle>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Badge variant="outline" className="text-xs border-gray-600 text-gray-300">
                    {project.visibility === 'private' ? <Lock className="h-3 w-3 mr-0.5" /> : <Globe className="h-3 w-3 mr-0.5" />}
                    {project.visibility === 'private' ? 'Private' : 'Public'}
                  </Badge>
                  <Badge variant="outline" className="text-xs border-gray-600 text-gray-300">
                    {project.baseLanguage}
                  </Badge>
                </div>
              </div>
              <CardDescription className="text-gray-400 line-clamp-2 min-h-[2.5rem]">
                {project.description || "No description"}
              </CardDescription>
            </CardHeader>
            <CardFooter className="pt-2 text-xs text-gray-500 border-t border-gray-700/50">
              Updated {project.updatedAt ? new Date(project.updatedAt).toLocaleDateString() : 'Never'}
            </CardFooter>
          </Card>
        </Link>
      ))}
    </div>
  );
}

export default function DashboardPage() {
  return (
    <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-1">
            Projects
          </h1>
          <p className="text-gray-400 text-sm">Manage your translation projects</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/projects/create">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Project
            </Button>
          </Link>
        </div>
      </div>
      <ProjectList />
    </main>
  );
}
