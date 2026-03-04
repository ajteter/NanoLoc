'use client';

import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTransition, useState, useEffect } from 'react';

export function SearchFilter({ initialSearch = '' }: { initialSearch?: string }) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [isPending, startTransition] = useTransition();
    const [search, setSearch] = useState(initialSearch);

    // Sync input with URL when user types
    const handleSearch = (value: string) => {
        setSearch(value);
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

    // Keep state in sync with URL if user navigates via browser back/forward
    useEffect(() => {
        setSearch(searchParams.get('search') || '');
    }, [searchParams]);

    return (
        <div className="relative flex-1 max-w-sm">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <Search className="h-5 w-5 text-gray-500" aria-hidden="true" />
            </div>
            <input
                type="text"
                name="search"
                id="search"
                className={`block w-full rounded-md border-0 bg-gray-800 py-1.5 pl-10 pr-10 text-white shadow-sm ring-1 ring-inset ring-gray-700 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-500 sm:text-sm sm:leading-6 ${isPending ? 'opacity-70' : ''}`}
                placeholder="Search projects"
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
            />
            {search && (
                <button
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 hover:text-white"
                    onClick={() => handleSearch('')}
                >
                    <X className="h-4 w-4" />
                </button>
            )}
        </div>
    );
}
