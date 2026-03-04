import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Plus, History } from 'lucide-react';
import { listProjects } from '@/lib/services/project.service';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';

export const metadata = {
  title: 'Dashboard - NanoLoc',
};

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) {
    redirect('/login');
  }

  const projects = await listProjects();

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
          <Link href="/activity">
            <Button variant="secondary" className="gap-2">
              <History className="h-4 w-4" />
              Activity Log
            </Button>
          </Link>
          <Link href="/projects/create">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Project
            </Button>
          </Link>
        </div>
      </div>

      {!projects || projects.length === 0 ? (
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
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Link key={project.id} href={`/projects/${project.id}`} className="block transition-transform hover:scale-[1.02]">
              <Card className="bg-gray-800 border-gray-700 hover:border-indigo-500 hover:shadow-lg transition-all h-full">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-white text-lg">{project.name}</CardTitle>
                    <Badge variant="outline" className="text-xs border-gray-600 text-gray-300">
                      {project.baseLanguage}
                    </Badge>
                  </div>
                  <CardDescription className="text-gray-400 line-clamp-2 min-h-[2.5rem]">
                    {project.description || "No description"}
                  </CardDescription>
                </CardHeader>
                <CardFooter className="pt-2 text-xs text-gray-500 border-t border-gray-700/50">
                  Updated {project.updatedAt ? project.updatedAt.toLocaleDateString() : 'Never'}
                </CardFooter>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
