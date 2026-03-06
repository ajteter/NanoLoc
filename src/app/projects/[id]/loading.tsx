import { Loader2 } from 'lucide-react';

export default function ProjectDetailLoading() {
    return (
        <main className="mx-auto max-w-[96rem] px-4 sm:px-6 lg:px-8 py-8">
            {/* Header skeleton */}
            <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <div className="h-4 w-4 bg-zinc-800 rounded animate-pulse" />
                        <div className="h-4 w-1 bg-zinc-800 rounded animate-pulse" />
                        <div className="h-4 w-32 bg-zinc-800 rounded animate-pulse" />
                    </div>
                    <div className="h-9 w-56 bg-zinc-800 rounded animate-pulse" />
                    <div className="h-4 w-80 bg-zinc-800 rounded animate-pulse mt-2" />
                </div>
                <div className="flex gap-3">
                    <div className="h-10 w-24 bg-zinc-800 rounded animate-pulse" />
                    <div className="h-10 w-28 bg-zinc-800 rounded animate-pulse" />
                    <div className="h-10 w-28 bg-zinc-800 rounded animate-pulse" />
                </div>
            </div>

            {/* Table skeleton */}
            <div className="rounded-md border border-zinc-700 bg-zinc-900/50 overflow-hidden">
                <div className="h-[400px] flex items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
                </div>
            </div>
        </main>
    );
}
