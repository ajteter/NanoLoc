import { Loader2 } from 'lucide-react';

export default function DashboardLoading() {
    return (
        <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <div className="h-9 w-40 bg-zinc-800 rounded animate-pulse" />
                    <div className="h-4 w-64 bg-zinc-800 rounded animate-pulse mt-2" />
                </div>
                <div className="flex gap-2">
                    <div className="h-10 w-32 bg-zinc-800 rounded animate-pulse" />
                    <div className="h-10 w-32 bg-zinc-800 rounded animate-pulse" />
                </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {[...Array(6)].map((_, i) => (
                    <div key={i} className="bg-zinc-800 border border-zinc-700 rounded-lg h-36 animate-pulse" />
                ))}
            </div>
        </main>
    );
}
