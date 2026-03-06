export default function ActivityLoading() {
    return (
        <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <div className="h-8 w-16 bg-zinc-800 rounded animate-pulse" />
                    <div className="h-9 w-40 bg-zinc-800 rounded animate-pulse" />
                </div>
            </div>
            <div className="space-y-2">
                {[...Array(10)].map((_, i) => (
                    <div key={i} className="bg-zinc-800 h-12 rounded-md animate-pulse" />
                ))}
            </div>
        </main>
    );
}
