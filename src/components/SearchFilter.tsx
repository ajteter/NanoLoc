'use client';

import { Search, X } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTransition, useState } from 'react';
import { cn } from '@/lib/utils';

export function SearchFilter({ initialSearch = '' }: { initialSearch?: string }) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [isPending, startTransition] = useTransition();

    // The single source of truth is the URL, or the default.
    // If we want instant visual updates before the URL navigation kicks in (which can take a few ms),
    // we can use a controlled internal state derived from the URL as initial state.
    const urlSearch = searchParams.get('search') || initialSearch;
    const [search, setSearch] = useState(urlSearch);

    // Sync input with URL when user types
    const handleSearch = (value: string) => {
        setSearch(value); // Instantly update UI

        startTransition(() => {
            const params = new URLSearchParams(searchParams);
            if (value) {
                params.set('search', value);
            } else {
                params.delete('search');
            }
            // Always reset pagination to page 1 on new search
            params.set('page', '1');
            router.push(`?${params.toString()}`);
        });
    };

    // If the URL changes from outside (e.g. browser back button), we need to resync the local state.
    // However, doing this synchronously in useEffect triggers the React linting error.
    // The standard React 18+ pattern for this is to reset the state by changing the `key` of the component, 
    // OR we can just derive it during render if it's uncontrolled, but since we need an instant update `onChange`, 
    // the cleanest approach is to update state if the prop/url literally changes.
    // Actually, setting state in render IS the correct React documentation pattern for "Adjusting some state when a prop changes" 
    // instead of an effect. Let's do that:
    const [prevUrlSearch, setPrevUrlSearch] = useState(urlSearch);
    if (urlSearch !== prevUrlSearch) {
        setPrevUrlSearch(urlSearch);
        setSearch(urlSearch);
    }

    return (
        <div className="relative flex-1 max-w-sm">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <Search className="h-5 w-5 text-zinc-500" aria-hidden="true" />
            </div>
            <input
                type="text"
                name="search"
                id="search"
                className={cn(
                    "block w-full rounded-md border-0 bg-zinc-800 py-1.5 pl-10 pr-10 text-white shadow-sm ring-1 ring-inset ring-zinc-700 placeholder:text-zinc-400 focus:ring-2 focus:ring-inset focus:ring-zinc-400 sm:text-sm sm:leading-6",
                    isPending && "opacity-70"
                )}
                placeholder="Search keys, values, or remarks..."
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
            />
            {search && (
                <button
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-zinc-500 hover:text-white"
                    onClick={() => handleSearch('')}
                >
                    <X className="h-4 w-4" />
                </button>
            )}
        </div>
    );
}
