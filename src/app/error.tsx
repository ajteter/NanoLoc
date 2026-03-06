'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RotateCcw } from 'lucide-react';

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error('Application error:', error);
    }, [error]);

    return (
        <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
                <AlertTriangle className="h-12 w-12 text-red-400 mb-4" />
                <h2 className="text-xl font-bold text-white mb-2">Something went wrong</h2>
                <p className="text-zinc-400 mb-6 max-w-md">
                    {error.message || 'An unexpected error occurred. Please try again.'}
                </p>
                <Button onClick={reset} className="gap-2">
                    <RotateCcw className="h-4 w-4" />
                    Try Again
                </Button>
            </div>
        </main>
    );
}
